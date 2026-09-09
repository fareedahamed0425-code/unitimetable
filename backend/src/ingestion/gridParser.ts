import { RawTimetableSheet, TimePeriodSlot, RawGridEntry } from './types';
import { cleanText, normalizeShorthand, parseTimeRange, parseDayName } from './normalizer';

export interface GridParseResult {
  headerRowIndex: number;
  timeRowIndex: number;
  periodSlots: TimePeriodSlot[];
  dayRowIndices: Array<{ rowIndex: number; dayIndex: number; dayName: string }>;
  rawEntries: RawGridEntry[];
  warnings: string[];
}

/**
 * Dynamically locates the timetable grid, period slots, time ranges, and extracts all raw cells per day.
 */
export function parseTimetableGrid(sheet: RawTimetableSheet): GridParseResult {
  const matrix = sheet.matrix;
  const warnings: string[] = [];

  let headerRowIndex = -1;
  let timeRowIndex = -1;

  // 1. Locate Header Row containing "Day" and Period Roman numerals (I, II, III...)
  for (let r = 0; r < Math.min(15, matrix.length); r++) {
    const row = matrix[r];
    const hasDay = row.some(cell => /^Day\b/i.test(cleanText(cell)));
    const hasPeriods = row.some(cell => /^(?:I|II|III|IV|V|VI|1|2|3)\b/i.test(cleanText(cell)));
    if (hasDay && hasPeriods) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex === -1) {
    // Fallback: find any row with "Monday" and assume the previous 1 or 2 rows are headers
    for (let r = 0; r < matrix.length; r++) {
      if (matrix[r].some(cell => /^Monday/i.test(cleanText(cell)))) {
        headerRowIndex = Math.max(0, r - 2);
        break;
      }
    }
  }

  // 2. Identify the time row (often immediately below or above header row)
  const candidateTimeRows = [headerRowIndex + 1, headerRowIndex - 1, headerRowIndex];
  for (const tr of candidateTimeRows) {
    if (tr >= 0 && tr < matrix.length) {
      const timeMatches = matrix[tr].filter(cell => /\d{1,2}[.:]\d{2}/.test(cleanText(cell))).length;
      if (timeMatches >= 2) {
        timeRowIndex = tr;
        break;
      }
    }
  }

  // 3. Build Period Slots Map
  const periodSlots: TimePeriodSlot[] = [];
  const headerRow = matrix[headerRowIndex] || [];
  const timeRow = timeRowIndex >= 0 ? matrix[timeRowIndex] || [] : [];

  let periodCounter = 1;
  const colCount = Math.max(headerRow.length, timeRow.length);

  for (let c = 1; c < colCount; c++) {
    const headerCell = cleanText(headerRow[c] || '');
    const timeCell = cleanText(timeRow[c] || '');
    const combinedCell = `${headerCell} ${timeCell}`.trim();

    if (!combinedCell) continue;

    // Check if this column is Break or Lunch
    const isBreak = /break/i.test(combinedCell) || /11[.:]00\s*(?:to|[-–])\s*11[.:]10/i.test(combinedCell);
    const isLunch = /lunch/i.test(combinedCell) || /1[.:]00\s*(?:to|[-–])\s*2[.:]00/i.test(combinedCell) || /13[.:]00\s*(?:to|[-–])\s*14[.:]00/i.test(combinedCell);

    // Extract time range
    let parsedTime = parseTimeRange(timeCell) || parseTimeRange(headerCell);
    
    // Default standard institutional slot timings if unparsed
    if (!parsedTime) {
      if (isBreak) {
        parsedTime = { startTime: '11:00', endTime: '11:10' };
      } else if (isLunch) {
        parsedTime = { startTime: '13:00', endTime: '14:00' };
      } else {
        // Assign default sequential period hours
        const defaultTimes: Record<number, { startTime: string; endTime: string }> = {
          1: { startTime: '09:00', endTime: '10:00' },
          2: { startTime: '10:00', endTime: '11:00' },
          3: { startTime: '11:10', endTime: '12:10' },
          4: { startTime: '12:10', endTime: '13:00' },
          5: { startTime: '14:00', endTime: '15:00' },
          6: { startTime: '15:00', endTime: '16:00' }
        };
        parsedTime = defaultTimes[periodCounter] || { startTime: `${8 + periodCounter}:00`, endTime: `${9 + periodCounter}:00` };
      }
    }

    let periodLabel = headerCell.replace(/\d{1,2}[.:]\d{2}\s*to\s*\d{1,2}[.:]\d{2}/gi, '').trim();
    if (!periodLabel) {
      if (isBreak) periodLabel = 'BREAK';
      else if (isLunch) periodLabel = 'LUNCH';
      else periodLabel = `P${periodCounter}`;
    }

    periodSlots.push({
      periodNumber: isBreak || isLunch ? 0 : periodCounter++,
      periodLabel,
      startTime: parsedTime.startTime,
      endTime: parsedTime.endTime,
      isBreak,
      isLunch,
      colIndex: c
    });
  }

  // 4. Locate Day Rows (Monday - Saturday)
  const dayRowIndices: Array<{ rowIndex: number; dayIndex: number; dayName: string }> = [];
  const startScanRow = Math.max(headerRowIndex, timeRowIndex) + 1;

  for (let r = startScanRow; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length === 0) continue;

    // First non-empty cell in row is usually the Day
    const firstCell = cleanText(row[0] || row[1] || '');
    const dayInfo = parseDayName(firstCell);
    if (dayInfo) {
      dayRowIndices.push({
        rowIndex: r,
        dayIndex: dayInfo.dayIndex,
        dayName: dayInfo.dayName
      });
    }

    // Stop if we hit the Subject table
    if (row.some(cell => /Sl\.?\s*No|Subject\s*Code/i.test(cleanText(cell)))) {
      break;
    }
  }

  // 5. Extract Raw Entries for each Day and Period Slot
  const rawEntries: RawGridEntry[] = [];

  for (const day of dayRowIndices) {
    const row = matrix[day.rowIndex];
    for (const slot of periodSlots) {
      if (slot.isBreak || slot.isLunch) continue;

      const rawValue = cleanText(row[slot.colIndex] || '');
      const normalizedValue = normalizeShorthand(rawValue);

      // Check if value is explicitly BREAK or LUNCH
      const isBreakCell = normalizedValue === 'BREAK' || /break/i.test(rawValue);
      const isLunchCell = normalizedValue === 'LUNCH' || /lunch/i.test(rawValue);

      if (!isBreakCell && !isLunchCell && rawValue && rawValue !== '-' && rawValue !== 'NIL') {
        rawEntries.push({
          dayName: day.dayName,
          dayOfWeek: day.dayIndex,
          periodNumber: slot.periodNumber,
          periodLabel: slot.periodLabel,
          startTime: slot.startTime,
          endTime: slot.endTime,
          colIndex: slot.colIndex,
          rawValue,
          normalizedValue,
          isBreak: false,
          isLunch: false
        });
      }
    }
  }

  return {
    headerRowIndex,
    timeRowIndex,
    periodSlots,
    dayRowIndices,
    rawEntries,
    warnings
  };
}
