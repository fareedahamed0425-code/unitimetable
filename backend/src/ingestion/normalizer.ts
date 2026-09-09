/**
 * Normalization utilities for text, Roman numerals, acronyms, time ranges, and days
 */

export function cleanText(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width chars
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes Roman numerals and spacing in shorthand labels:
 * e.g. "FE - 1" -> "FE-I", "PE-1" -> "PE-I", "FE - I" -> "FE-I", "MOOC-1" -> "MOOC-I"
 */
export function normalizeShorthand(val: string): string {
  let clean = cleanText(val).toUpperCase();
  
  // Normalize hyphen spacing: "FE - I" -> "FE-I", "PE - I" -> "PE-I"
  clean = clean.replace(/\s*[-–—]\s*/g, '-');
  
  // Normalize Roman numeral variations
  clean = clean.replace(/FE-1\b/g, 'FE-I');
  clean = clean.replace(/PE-1\b/g, 'PE-I');
  clean = clean.replace(/MOOC-1\b/g, 'MOOC-I');
  clean = clean.replace(/FE-2\b/g, 'FE-II');
  clean = clean.replace(/PE-2\b/g, 'PE-II');
  clean = clean.replace(/MOOC-2\b/g, 'MOOC-II');

  // Normalize spaces around symbols
  clean = clean.replace(/\s*&\s*/g, '&');
  
  return clean;
}

/**
 * Generates candidate acronyms and abbreviations for a full subject name
 * e.g. "Computer Networks" -> ["CN"]
 * "Automata and Compiler Design" -> ["ACD", "AACD"]
 * "Cryptography and Network Security" -> ["CNS"]
 * "Entrepreneurship and Start up Management" -> ["E&SM", "ESM", "E&S M"]
 * "Data Analytics and Visulaization" -> ["DAV"]
 * "Artificial Intelligence" -> ["AI"]
 * "AI and ML in Business Models" -> ["AI&ML IN BM", "AIML IN BM", "AI&ML"]
 */
export function generateAcronyms(subjectName: string): string[] {
  const acronyms = new Set<string>();
  const clean = cleanText(subjectName);
  if (!clean) return [];

  // Direct shorthand checks
  if (/Faculty Elective\s*[-–—]?\s*[1I]/i.test(clean)) {
    acronyms.add('FE-I');
    acronyms.add('FE-1');
  }
  if (/Program(?:me)? Elective\s*[-–—]?\s*[1I]/i.test(clean)) {
    acronyms.add('PE-I');
    acronyms.add('PE-1');
  }
  if (/Faculty Elective\s*[-–—]?\s*[2II]/i.test(clean)) {
    acronyms.add('FE-II');
    acronyms.add('FE-2');
  }
  if (/Program(?:me)? Elective\s*[-–—]?\s*[2II]/i.test(clean)) {
    acronyms.add('PE-II');
    acronyms.add('PE-2');
  }
  if (/MOOC\s*[-–—]?\s*[1I]/i.test(clean)) {
    acronyms.add('MOOC-I');
    acronyms.add('MOOC-1');
  }

  const words = clean
    .replace(/[()\-–—,/]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const stopWords = new Set(['and', 'in', 'of', 'for', 'with', 'the', 'to', 'a', '&', 'up', 'on', 'at', 'by', 'an', 'as']);
  const keyWords = words.filter(w => !stopWords.has(w.toLowerCase()));
  if (keyWords.length > 0) {
    const acronym = keyWords.map(w => w[0].toUpperCase()).join('');
    acronyms.add(acronym);
    
    // With & e.g. "Entrepreneurship and Start up Management" -> "E&SM", "ESM"
    if (words.some(w => w.toLowerCase() === 'and' || w === '&')) {
      const parts = clean.split(/\s+(?:and|&)\s+/i);
      if (parts.length === 2) {
        const p1 = parts[0].split(/\s+/).filter(w => !stopWords.has(w.toLowerCase())).map(w => w[0].toUpperCase()).join('');
        const p2 = parts[1].split(/\s+/).filter(w => !stopWords.has(w.toLowerCase())).map(w => w[0].toUpperCase()).join('');
        acronyms.add(`${p1}&${p2}`);
        acronyms.add(`${p1} & ${p2}`);
        acronyms.add(`${p1}${p2}`);
      }
    }
  }

  // Also full letter acronym including all words
  if (words.length > 1) {
    acronyms.add(words.map(w => w[0].toUpperCase()).join(''));
  }

  // Handle Lab variations
  if (/Lab(?:oratory)?/i.test(clean)) {
    const baseName = clean.replace(/Lab(?:oratory)?/i, '').trim();
    const baseAcronyms = generateAcronyms(baseName);
    baseAcronyms.forEach(a => {
      acronyms.add(`${a} LAB`);
      acronyms.add(`${a}LAB`);
    });
  }

  return Array.from(acronyms);
}

/**
 * Parses time strings into standard 24-hour HH:MM format
 * e.g. "09.00 to 10.00" -> { start: "09:00", end: "10:00" }
 * "1.00 to 2.00" -> { start: "13:00", end: "14:00" }
 * "11.10 to 12.10" -> { start: "11:10", end: "12:10" }
 * "12.10 to 1.00" -> { start: "12:10", end: "13:00" }
 */
export function parseTimeRange(timeStr: string): { startTime: string; endTime: string } | null {
  const clean = cleanText(timeStr);
  if (!clean) return null;

  // Match patterns like "09.00 to 10.00", "09:00 - 10:00", "1.00 to 2.00", "12.10 to 1.00"
  const match = clean.match(/(\d{1,2})[.:](\d{2})\s*(?:to|[-–—]|until)\s*(\d{1,2})[.:](\d{2})/i);
  if (!match) {
    // Try single hour e.g. "9 to 10" or "9 - 10"
    const simpleMatch = clean.match(/(\d{1,2})\s*(?:to|[-–—])\s*(\d{1,2})/i);
    if (simpleMatch) {
      let h1 = parseInt(simpleMatch[1], 10);
      let h2 = parseInt(simpleMatch[2], 10);
      if (h1 >= 1 && h1 <= 7) h1 += 12; // PM adjustment
      if (h2 >= 1 && h2 <= 7) h2 += 12;
      return {
        startTime: `${String(h1).padStart(2, '0')}:00`,
        endTime: `${String(h2).padStart(2, '0')}:00`
      };
    }
    return null;
  }

  let h1 = parseInt(match[1], 10);
  const m1 = match[2];
  let h2 = parseInt(match[3], 10);
  const m2 = match[4];

  // Afternoon PM adjustment:
  // If h1 is between 1 and 7, it's afternoon (13:00 to 19:00)
  // If h2 is between 1 and 7 and h1 >= 9, h2 is afternoon
  if (h1 >= 1 && h1 <= 7) h1 += 12;
  if (h2 >= 1 && h2 <= 7) h2 += 12;

  // Special case: 12.10 to 1.00 -> h1=12, h2=13
  if (h1 === 12 && h2 < 12) h2 += 12;

  return {
    startTime: `${String(h1).padStart(2, '0')}:${m1}`,
    endTime: `${String(h2).padStart(2, '0')}:${m2}`
  };
}

/**
 * Normalizes day name to index 0-5 (Mon-Sat)
 */
export function parseDayName(dayStr: string): { dayIndex: number; dayName: string } | null {
  const clean = cleanText(dayStr).toLowerCase();
  if (clean.includes('mon')) return { dayIndex: 0, dayName: 'Monday' };
  if (clean.includes('tue')) return { dayIndex: 1, dayName: 'Tuesday' };
  if (clean.includes('wed')) return { dayIndex: 2, dayName: 'Wednesday' };
  if (clean.includes('thu')) return { dayIndex: 3, dayName: 'Thursday' };
  if (clean.includes('fri')) return { dayIndex: 4, dayName: 'Friday' };
  if (clean.includes('sat')) return { dayIndex: 5, dayName: 'Saturday' };
  if (clean.includes('sun')) return { dayIndex: 6, dayName: 'Sunday' };
  return null;
}

/**
 * Converts Roman or string year representation to integer 1-4
 */
export function parseYearNumber(yearStr: string): number {
  const clean = cleanText(yearStr).toUpperCase();
  if (clean.includes('IV') || clean === '4' || clean.includes('4TH') || clean.includes('FINAL')) return 4;
  if (clean.includes('III') || clean === '3' || clean.includes('3RD') || clean.includes('THIRD')) return 3;
  if (clean.includes('II') || clean === '2' || clean.includes('2ND') || clean.includes('SECOND')) return 2;
  if (clean.includes('I') || clean === '1' || clean.includes('1ST') || clean.includes('FIRST')) return 1;
  return 3;
}

/**
 * Converts semester representation to integer (1-8)
 */
export function parseSemesterNumber(semStr: string): number {
  const clean = cleanText(semStr).toUpperCase();
  if (clean.includes('VIII') || clean === '8') return 8;
  if (clean.includes('VII') || clean === '7') return 7;
  if (clean.includes('VI') || clean === '6') return 6;
  if (clean.includes('V') || clean === '5') return 5;
  if (clean.includes('IV') || clean === '4') return 4;
  if (clean.includes('III') || clean === '3') return 3;
  if (clean.includes('II') || clean === '2') return 2;
  if (clean.includes('I') || clean === '1') return 1;
  return 5;
}
