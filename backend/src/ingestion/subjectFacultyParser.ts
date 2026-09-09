import { RawTimetableSheet, SubjectFacultyEntry } from './types';
import { cleanText, normalizeShorthand, generateAcronyms } from './normalizer';

/**
 * Extracts and structures the companion Subject & Faculty mapping table from the lower section of a timetable sheet.
 */
export function parseSubjectFacultyTable(sheet: RawTimetableSheet): SubjectFacultyEntry[] {
  const matrix = sheet.matrix;
  const entries: SubjectFacultyEntry[] = [];

  let headerRowIndex = -1;
  let slCol = -1;
  let codeCol = -1;
  let nameCol = -1;
  let facultyCol = -1;
  let phoneCol = -1;
  let hrsCol = -1;

  // 1. Locate Table Header Row
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    for (let c = 0; c < row.length; c++) {
      const cell = cleanText(row[c]);
      if (/^Sl\.?\s*No/i.test(cell)) slCol = c;
      if (/Subject\s*Code/i.test(cell)) codeCol = c;
      if (/Subject\s*Name/i.test(cell)) nameCol = c;
      if (/Faculty\s*(?:Full)?\s*Name/i.test(cell)) facultyCol = c;
      if (/Phone\s*(?:No)?/i.test(cell)) phoneCol = c;
      if (/Hrs|Hours/i.test(cell)) hrsCol = c;
    }
    if ((nameCol >= 0 || codeCol >= 0) && (facultyCol >= 0 || slCol >= 0)) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex === -1) {
    return entries;
  }

  // Fallback column positions if merged headers didn't set exact indices
  if (slCol === -1) slCol = 0;
  if (codeCol === -1) codeCol = 1;
  if (nameCol === -1) nameCol = 2;
  if (facultyCol === -1) facultyCol = Math.min(5, (matrix[headerRowIndex]?.length || 6) - 3);
  if (phoneCol === -1) phoneCol = Math.min(8, (matrix[headerRowIndex]?.length || 9) - 2);
  if (hrsCol === -1) hrsCol = Math.min(9, (matrix[headerRowIndex]?.length || 10) - 1);

  // 2. Iterate rows below header
  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length === 0) continue;

    const rowText = row.filter(Boolean).join(' ');
    // Stop condition: footer metadata rows
    if (/Prepared\s*By|Approved\s*By|Doc\.?\s*No|Verified\s*By|Reviewed\s*By/i.test(rowText)) {
      break;
    }

    const rawSl = cleanText(row[slCol] || '');
    const slNo = parseInt(rawSl, 10) || (entries.length + 1);

    const subjectCode = cleanText(row[codeCol] || '').toUpperCase();
    
    // Find subject name: may span across columns nameCol to facultyCol - 1
    let rawName = cleanText(row[nameCol] || '');
    if (!rawName && nameCol + 1 < facultyCol) {
      rawName = cleanText(row[nameCol + 1] || '');
    }

    // Find faculty name: may span across columns facultyCol to phoneCol - 1
    let rawFaculty = cleanText(row[facultyCol] || '');
    if (!rawFaculty && facultyCol + 1 < phoneCol) {
      rawFaculty = cleanText(row[facultyCol + 1] || '');
    }

    const rawPhone = cleanText(row[phoneCol] || '');
    const rawHrs = cleanText(row[hrsCol] || '');
    const hoursPerWeek = parseInt(rawHrs, 10) || 3;

    if (!rawName && !subjectCode && !rawFaculty) continue;

    // Split faculty names (e.g. "Dr.G.Asha, Dr. A B Manju" or "Dr K. Divya/Dr N Jayakrishna/...")
    const facultyNames = rawFaculty
      .split(/[,;/+]+/)
      .map(s => cleanText(s))
      .filter(s => s && s !== '-' && !/^\d+$/.test(s));

    const facultyPhones = rawPhone
      .split(/[,;/+]+/)
      .map(s => cleanText(s).replace(/[^0-9]/g, ''))
      .filter(s => s.length >= 7);

    const isLab = /Lab(?:oratory)?/i.test(rawName) || /Lab/i.test(subjectCode);
    const isElective = /Elective/i.test(rawName) || /PE\b|FE\b/i.test(rawName);

    const normalizedSubjectName = cleanText(rawName).toUpperCase();
    const acronyms = generateAcronyms(rawName);

    entries.push({
      slNo,
      subjectCode,
      subjectName: rawName || subjectCode || `Subject-${slNo}`,
      normalizedSubjectName,
      acronyms,
      facultyNames: facultyNames.length > 0 ? facultyNames : [rawFaculty || 'Faculty Instructor'],
      facultyPhones,
      hoursPerWeek,
      rawFaculty,
      rawPhone,
      isLab,
      isElective
    });
  }

  return entries;
}
