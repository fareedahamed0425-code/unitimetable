import { RawTimetableSheet } from './types';
import { cleanText, parseYearNumber } from './normalizer';

export interface DetectedSheetInfo {
  sheet: RawTimetableSheet;
  isTimetable: boolean;
  confidenceScore: number;
  extractedSection: string;
  extractedDept: string;
  extractedYear: number;
  reason: string;
}

/**
 * Dynamically detects which worksheets in the workbook are institutional timetables.
 */
export function detectTimetableSheets(sheets: RawTimetableSheet[]): DetectedSheetInfo[] {
  return sheets.map(sheet => {
    let score = 0;
    const reasons: string[] = [];
    const fullText = sheet.matrix.map(row => row.join(' ')).join('\n');

    // 1. Check for Days
    const hasMonday = /Monday/i.test(fullText);
    const hasTuesday = /Tuesday/i.test(fullText);
    const hasWednesday = /Wednesday/i.test(fullText);
    const daysFound = [hasMonday, hasTuesday, hasWednesday].filter(Boolean).length;

    if (daysFound >= 2) {
      score += 40;
      reasons.push('Contains day headers');
    }

    // 2. Check for Period Indicators or Timetable Keywords
    if (/TIME\s*TABLE/i.test(fullText) || /w\.e\.f/i.test(fullText)) {
      score += 25;
      reasons.push('Contains timetable title/w.e.f.');
    }

    if (/(?:Sl\.?\s*No|Subject\s*Code|Faculty\s*Full\s*Name)/i.test(fullText)) {
      score += 25;
      reasons.push('Contains subject/faculty table');
    }

    if (/\b(?:09[.:]00|10[.:]00|11[.:]00|12[.:]10|2[.:]00|3[.:]00)\b/.test(fullText)) {
      score += 20;
      reasons.push('Contains timetable time slots');
    }

    // 3. Extract Section & Department from sheet name or text
    let extractedSection = '';
    let extractedDept = 'CSE';
    let extractedYear = 3;

    // e.g. "III AIML-A", "III AIML-B", "III CS", "CSE-A", "Year 3 AIDS-B"
    const sheetNameClean = cleanText(sheet.sheetName);
    const yearMatch = sheetNameClean.match(/^(?:Year\s*)?(IV|III|II|I|1|2|3|4)\b/i);
    if (yearMatch) {
      extractedYear = parseYearNumber(yearMatch[1]);
    }

    // Extract section name: remove leading year
    let secCandidate = sheetNameClean.replace(/^(?:Year\s*)?(?:IV|III|II|I|1|2|3|4)\s*/i, '').trim();
    if (secCandidate) {
      extractedSection = secCandidate.toUpperCase();
    } else {
      extractedSection = sheetNameClean.toUpperCase();
    }

    // Map department
    if (/AIML|AI&ML|AI\s*ML/i.test(extractedSection)) {
      extractedDept = 'AIML';
    } else if (/AIDS|AI&DS|AI\s*DS/i.test(extractedSection)) {
      extractedDept = 'AIDS';
    } else if (/\bCS\b|CYBER/i.test(extractedSection)) {
      extractedDept = 'CS';
    } else if (/CSE/i.test(extractedSection)) {
      extractedDept = 'CSE';
    }

    const isTimetable = score >= 50;

    return {
      sheet,
      isTimetable,
      confidenceScore: score,
      extractedSection,
      extractedDept,
      extractedYear,
      reason: reasons.join(', ')
    };
  });
}
