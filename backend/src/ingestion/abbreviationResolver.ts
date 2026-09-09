import { RawGridEntry, SubjectFacultyEntry, ResolvedTimetableSession, TimetableMetadata } from './types';
import { cleanText, normalizeShorthand } from './normalizer';

/**
 * Classifies activity type based on raw cell text and subject metadata.
 */
export function classifyActivityType(text: string, subjectEntry?: SubjectFacultyEntry): ResolvedTimetableSession['activityType'] {
  const upper = cleanText(text).toUpperCase();

  if (upper.includes('LAB') || (subjectEntry && subjectEntry.isLab)) return 'LABORATORY';
  if (upper.includes('MENTORING') || upper.includes('MENTOR')) return 'MENTORING';
  if (upper.includes('SPORTS') || upper.includes('PHYSICAL')) return 'SPORTS';
  if (upper.includes('CLUB')) return 'CLUB_ACTIVITY';
  if (upper.includes('CRT')) return 'CRT';
  if (upper === 'PT' || upper.includes('PLACEMENT')) return 'PLACEMENT_TRAINING';
  if (upper.includes('APTITUDE')) return 'OTHER';
  if (upper.includes('LIBRARY')) return 'LIBRARY';
  if (upper.includes('MOOC')) return 'MOOC';
  if (upper.includes('SEMINAR')) return 'SEMINAR';
  if (upper.includes('TUTORIAL') || upper.includes('TUT')) return 'TUTORIAL';

  return 'LECTURE';
}

/**
 * Resolves raw timetable grid cell entries against the extracted Subject/Faculty table.
 * Merges consecutive periods (e.g. 2-hour labs) into unified sessions.
 */
export function resolveTimetableEntries(
  rawEntries: RawGridEntry[],
  subjectTable: SubjectFacultyEntry[],
  metadata: TimetableMetadata
): ResolvedTimetableSession[] {
  // Sort raw entries by dayOfWeek, then periodNumber
  const sortedEntries = [...rawEntries].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.periodNumber - b.periodNumber;
  });

  const resolvedList: ResolvedTimetableSession[] = [];
  const visitedIndices = new Set<number>();

  for (let i = 0; i < sortedEntries.length; i++) {
    if (visitedIndices.has(i)) continue;

    const entry = sortedEntries[i];
    const rawVal = entry.rawValue;
    const normVal = entry.normalizedValue;

    // 1. Try to find a matching subject from the subject/faculty table
    let matchedSubject: SubjectFacultyEntry | undefined = undefined;
    let confidence = 0;
    let resolutionNotes = '';

    // Strategy A: Acronym exact match (e.g. "CN" -> Computer Networks, "ACD" -> Automata and Compiler Design, "E&SM" -> Entrepreneurship)
    matchedSubject = subjectTable.find(s => 
      s.acronyms.some(a => normalizeShorthand(a) === normVal || a.toUpperCase() === normVal)
    );
    if (matchedSubject) {
      confidence = 0.95;
      resolutionNotes = `Matched acronym: ${normVal} -> ${matchedSubject.subjectName}`;
    }

    // Strategy B: Direct match on Subject Code
    if (!matchedSubject) {
      matchedSubject = subjectTable.find(s => s.subjectCode && s.subjectCode.toUpperCase() === normVal);
      if (matchedSubject) {
        confidence = 0.98;
        resolutionNotes = `Matched subject code: ${matchedSubject.subjectCode}`;
      }
    }

    // Strategy C: Exact or substring match on Subject Name
    if (!matchedSubject) {
      matchedSubject = subjectTable.find(s => {
        const sNorm = normalizeShorthand(s.subjectName);
        return sNorm === normVal || sNorm.includes(normVal) || normVal.includes(sNorm);
      });
      if (matchedSubject) {
        confidence = 0.85;
        resolutionNotes = `Matched subject name pattern: ${matchedSubject.subjectName}`;
      }
    }

    // Strategy D: Elective and Special Token matching (FE-I, PE-I, MOOC, CRT, etc.)
    if (!matchedSubject) {
      if (/^FE[-–]?[1I]/i.test(normVal)) {
        matchedSubject = subjectTable.find(s => /Faculty\s*Elective\s*[-–]?\s*[1I]/i.test(s.subjectName));
      } else if (/^PE[-–]?[1I]/i.test(normVal)) {
        matchedSubject = subjectTable.find(s => /Program(?:me)?\s*Elective\s*[-–]?\s*[1I]/i.test(s.subjectName));
      } else if (/^MOOC/i.test(normVal)) {
        matchedSubject = subjectTable.find(s => /MOOC/i.test(s.subjectName));
      } else if (/^CRT/i.test(normVal)) {
        matchedSubject = subjectTable.find(s => /CRT/i.test(s.subjectName));
      } else if (/^PT\b|PLACEMENT/i.test(normVal)) {
        matchedSubject = subjectTable.find(s => /Placement\s*Training|Physical/i.test(s.subjectName));
      } else if (/^LIBRARY/i.test(normVal)) {
        matchedSubject = subjectTable.find(s => /Library/i.test(s.subjectName));
      } else if (/^MENTORING/i.test(normVal)) {
        matchedSubject = subjectTable.find(s => /Mentoring/i.test(s.subjectName));
      } else if (/^SPORTS/i.test(normVal)) {
        matchedSubject = subjectTable.find(s => /Physical|Sports/i.test(s.subjectName));
      } else if (/^APTITUDE/i.test(normVal)) {
        matchedSubject = subjectTable.find(s => /Aptitude/i.test(s.subjectName));
      } else if (/^Club/i.test(normVal)) {
        matchedSubject = subjectTable.find(s => /Extra-curr|Club/i.test(s.subjectName));
      }
      if (matchedSubject) {
        confidence = 0.90;
        resolutionNotes = `Matched special activity/elective: ${matchedSubject.subjectName}`;
      }
    }

    // 2. Check for multi-period continuation (e.g. 2-hour lab in period 5 and 6)
    let duration = 1;
    let finalEndTime = entry.endTime;

    for (let j = i + 1; j < sortedEntries.length; j++) {
      const nextEntry = sortedEntries[j];
      if (nextEntry.dayOfWeek === entry.dayOfWeek && 
          nextEntry.periodNumber === entry.periodNumber + duration &&
          (nextEntry.normalizedValue === normVal || nextEntry.rawValue === rawVal)) {
        duration++;
        finalEndTime = nextEntry.endTime;
        visitedIndices.add(j);
      } else {
        break;
      }
    }

    // 3. Determine final values
    const activityType = classifyActivityType(rawVal, matchedSubject);
    
    // Generate or resolve Course Code
    let subjectCode = matchedSubject?.subjectCode || '';
    if (!subjectCode) {
      if (activityType === 'LABORATORY') {
        subjectCode = `LAB-${normVal.replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'EXP'}`;
      } else {
        subjectCode = normVal.replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'CRS';
      }
    }

    const subjectName = matchedSubject?.subjectName || rawVal;
    const teacherNames = matchedSubject?.facultyNames?.length 
      ? matchedSubject.facultyNames 
      : (metadata.classTeacher ? [metadata.classTeacher] : ['Faculty Instructor']);
    const teacherPhones = matchedSubject?.facultyPhones || [];

    // Room resolution: Labs get designated computer lab, regular theory gets class room from metadata
    let roomCode = metadata.roomNumber || 'CR-201';
    if (activityType === 'LABORATORY') {
      roomCode = `LAB-${metadata.resolvedDeptCode}-1`;
    }

    resolvedList.push({
      dayOfWeek: entry.dayOfWeek,
      dayName: entry.dayName,
      periodIndex: entry.periodNumber,
      periodNumber: entry.periodNumber,
      periodLabel: entry.periodLabel,
      startTime: entry.startTime,
      endTime: finalEndTime,
      duration,
      rawValue: rawVal,
      normalizedValue: normVal,
      subjectCode: subjectCode.toUpperCase(),
      subjectName,
      activityType,
      teacherNames,
      teacherPhones,
      roomCode: roomCode.toUpperCase(),
      sectionNames: [metadata.resolvedSectionName],
      isResolved: matchedSubject !== undefined,
      resolutionConfidence: confidence,
      resolutionNotes
    });
  }

  return resolvedList;
}
