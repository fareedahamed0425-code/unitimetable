import { RawTimetableSheet, TimetableMetadata } from './types';
import { cleanText, parseYearNumber, parseSemesterNumber } from './normalizer';

/**
 * Parses header section of a timetable sheet to extract all institutional and class metadata.
 */
export function parseTimetableMetadata(sheet: RawTimetableSheet, defaultSection: string = '', defaultDept: string = 'CSE', defaultYear: number = 3): TimetableMetadata {
  const metadata: TimetableMetadata = {
    institutionName: 'The Apollo University',
    schoolName: 'School of Technology',
    timetableTitle: 'TIME TABLE',
    effectiveFrom: '',
    classTeacher: '',
    roomNumber: 'CR-201',
    refNumber: '',
    issueNumber: '',
    date: '',
    revision: '',
    revisionDate: '',
    course: 'B.Tech',
    department: defaultDept,
    year: `Year ${defaultYear}`,
    semester: 'Semester 5',
    academicYear: '2026-27',
    resolvedSectionName: defaultSection || 'CSE-A',
    resolvedDeptCode: defaultDept,
    resolvedYearNumber: defaultYear
  };

  // Search through the first 10 rows for metadata patterns
  const headerRows = sheet.matrix.slice(0, 10);

  for (let r = 0; r < headerRows.length; r++) {
    const rowText = headerRows[r].filter(Boolean).join('   ');
    if (!rowText) continue;

    // Institution Name
    if (/The Apollo University|Apollo University/i.test(rowText)) {
      metadata.institutionName = 'The Apollo University';
    }

    // School Name
    if (/School of Technology/i.test(rowText)) {
      metadata.schoolName = 'School of Technology';
    }

    // Effective from (w.e.f)
    const wefMatch = rowText.match(/w\.e\.f[:\s]+(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})/i);
    if (wefMatch) {
      metadata.effectiveFrom = wefMatch[1].trim();
    }

    // Class Teacher
    const teacherMatch = rowText.match(/Class\s*Teacher[:\s]+([^;]+?)(?=\s+Room|\s+Ref|\s*$)/i);
    if (teacherMatch) {
      metadata.classTeacher = cleanText(teacherMatch[1]).replace(/^[:\s]+/, '');
    }

    // Room Number
    const roomMatch = rowText.match(/Room\s*(?:No)?[:\s]*([A-Za-z0-9\-]+)/i);
    if (roomMatch) {
      const rm = cleanText(roomMatch[1]);
      metadata.roomNumber = rm.startsWith('CR-') || rm.startsWith('LAB-') ? rm : `CR-${rm}`;
    }

    // Ref No
    const refMatch = rowText.match(/Ref\.\s*No\.?[:\s]*([^;]+?)(?=\s+ISSUE|\s+Date|\s*$)/i);
    if (refMatch) {
      metadata.refNumber = cleanText(refMatch[1]);
    }

    // Issue No
    const issueMatch = rowText.match(/ISSUE\s*No[:\s]*([0-9]+)/i);
    if (issueMatch) {
      metadata.issueNumber = cleanText(issueMatch[1]);
    }

    // Date
    const dateMatch = rowText.match(/(?:^|\s)Date[:\s]*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})/i);
    if (dateMatch) {
      metadata.date = cleanText(dateMatch[1]);
    }

    // Revision
    const revMatch = rowText.match(/Revision[:\s]*([0-9]+)/i);
    if (revMatch) {
      metadata.revision = cleanText(revMatch[1]);
    }

    // Revision Date
    const revDateMatch = rowText.match(/Revision\s*Date[:\s]*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})/i);
    if (revDateMatch) {
      metadata.revisionDate = cleanText(revDateMatch[1]);
    }

    // Course
    const courseMatch = rowText.match(/Course[:\s]+([^;]+?)(?=\s+Dept|\s+Year|\s+Sem|\s*$)/i);
    if (courseMatch) {
      metadata.course = cleanText(courseMatch[1]);
    }

    // Dept
    const deptMatch = rowText.match(/Dept[:\s]+([^;]+?)(?=\s+Year|\s+Sem|\s+Academic|\s*$)/i);
    if (deptMatch) {
      const deptRaw = cleanText(deptMatch[1]);
      metadata.department = deptRaw;
      if (/AIML|AI&ML/i.test(deptRaw)) metadata.resolvedDeptCode = 'AIML';
      else if (/AIDS|AI&DS/i.test(deptRaw)) metadata.resolvedDeptCode = 'AIDS';
      else if (/\bCS\b|CYBER/i.test(deptRaw)) metadata.resolvedDeptCode = 'CS';
      else if (/CSE/i.test(deptRaw)) metadata.resolvedDeptCode = 'CSE';
    }

    // Year
    const yrMatch = rowText.match(/Year[:\s]+([IV1-4]+)/i);
    if (yrMatch) {
      const yrNum = parseYearNumber(yrMatch[1]);
      metadata.year = `Year ${yrNum}`;
      metadata.resolvedYearNumber = yrNum;
    }

    // Semester
    const semMatch = rowText.match(/Sem(?:ester)?\s*[-:\s]+([IV1-8]+)/i);
    if (semMatch) {
      const semNum = parseSemesterNumber(semMatch[1]);
      metadata.semester = `Semester ${semNum}`;
    }

    // Academic Year
    const acadMatch = rowText.match(/Academic\s*Year[:\s]+(\d{4}[-\s]\d{2,4})/i);
    if (acadMatch) {
      metadata.academicYear = cleanText(acadMatch[1]).replace(/\s+/g, '-');
    }
  }

  // Refine section name if still generic
  if (defaultSection) {
    metadata.resolvedSectionName = defaultSection.toUpperCase();
  } else if (metadata.department) {
    metadata.resolvedSectionName = metadata.department.toUpperCase();
  }

  return metadata;
}
