import { ParsedTimetableEntity, ValidationReport } from './types';

/**
 * Generates a comprehensive validation report for parsed timetable entities before writing to SQL.
 */
export function validateParsedTimetables(timetables: ParsedTimetableEntity[], totalSheetsFound: number): ValidationReport {
  const warnings: string[] = [];
  const errors: string[] = [];
  const unresolvedSessions: Array<{ sheet: string; day: string; period: string; rawValue: string }> = [];

  let totalSessions = 0;
  let resolvedCount = 0;

  for (const tt of timetables) {
    totalSessions += tt.sessions.length;

    // Check for days extracted
    const uniqueDays = new Set(tt.sessions.map(s => s.dayOfWeek));
    if (uniqueDays.size < 5) {
      warnings.push(`Sheet [${tt.sheetName}]: Only ${uniqueDays.size} days were extracted (expected 6 days Mon–Sat).`);
    }

    // Check for period conflicts within the sheet
    const occupiedSlots = new Set<string>();
    for (const session of tt.sessions) {
      if (session.isResolved) resolvedCount++;
      else {
        unresolvedSessions.push({
          sheet: tt.sheetName,
          day: session.dayName,
          period: session.periodLabel,
          rawValue: session.rawValue
        });
      }

      for (let p = 0; p < session.duration; p++) {
        const slotKey = `${session.dayOfWeek}-${session.periodIndex + p}`;
        if (occupiedSlots.has(slotKey)) {
          warnings.push(`Sheet [${tt.sheetName}]: Overlapping session detected at Day ${session.dayName}, Period ${session.periodIndex + p}.`);
        }
        occupiedSlots.add(slotKey);
      }
    }

    // Check if subject table was found
    if (tt.subjectTable.length === 0) {
      warnings.push(`Sheet [${tt.sheetName}]: No companion subject/faculty table detected.`);
    }
  }

  if (timetables.length === 0) {
    errors.push('No valid timetable sheets could be extracted from the uploaded workbook.');
  }

  const isValid = errors.length === 0 && totalSessions > 0;

  return {
    totalSheetsFound,
    validTimetableSheetsCount: timetables.length,
    detectedSheetNames: timetables.map(t => t.sheetName),
    totalSessionsExtracted: totalSessions,
    totalResolvedSessions: resolvedCount,
    unresolvedSessions,
    warnings,
    errors,
    isValid
  };
}
