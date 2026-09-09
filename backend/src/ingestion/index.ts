import { readWorkbookWithMerges } from './workbookReader';
import { detectTimetableSheets } from './worksheetDetector';
import { parseTimetableMetadata } from './metadataParser';
import { parseTimetableGrid } from './gridParser';
import { parseSubjectFacultyTable } from './subjectFacultyParser';
import { resolveTimetableEntries } from './abbreviationResolver';
import { validateParsedTimetables } from './validator';
import { updateDatabaseWithTimetables } from './databaseUpdater';
import { IngestionResult, ParsedTimetableEntity } from './types';

export * from './types';
export * from './normalizer';
export * from './workbookReader';
export * from './worksheetDetector';
export * from './metadataParser';
export * from './gridParser';
export * from './subjectFacultyParser';
export * from './abbreviationResolver';
export * from './validator';
export * from './databaseUpdater';

/**
 * Master Ingestion Function:
 * Ingests an Excel timetable workbook, extracts all sheets dynamically, resolves shorthand & abbreviations,
 * validates the structure, and optionally updates the SQL database.
 */
export async function processTimetableWorkbook(
  input: Buffer | string,
  options: {
    persist?: boolean;
    timetableId?: string;
    targetSection?: string; // If set, only process/apply this specific section
  } = {}
): Promise<IngestionResult> {
  const { persist = true, timetableId = 'tt-active', targetSection } = options;

  try {
    // 1. Read workbook and resolve all merged cells
    const { sheets } = readWorkbookWithMerges(input);

    if (!sheets || sheets.length === 0) {
      return {
        success: false,
        validationReport: {
          totalSheetsFound: 0,
          validTimetableSheetsCount: 0,
          detectedSheetNames: [],
          totalSessionsExtracted: 0,
          totalResolvedSessions: 0,
          unresolvedSessions: [],
          warnings: [],
          errors: ['No readable worksheets found in the uploaded workbook.'],
          isValid: false
        },
        timetables: [],
        error: 'No readable worksheets found in the uploaded workbook.'
      };
    }

    // 2. Discover timetable sheets dynamically
    const detectedSheets = detectTimetableSheets(sheets);
    const validSheets = detectedSheets.filter(d => d.isTimetable);

    // If targetSection is specified, filter to only the matching sheet
    const sheetsToProcess = targetSection && targetSection !== 'ALL'
      ? validSheets.filter(s => s.extractedSection.toUpperCase().includes(targetSection.toUpperCase()) || targetSection.toUpperCase().includes(s.extractedSection.toUpperCase()))
      : validSheets;

    const parsedTimetables: ParsedTimetableEntity[] = [];

    // 3. Process each valid timetable sheet
    for (const item of sheetsToProcess) {
      const sheet = item.sheet;
      
      // Parse Metadata
      const metadata = parseTimetableMetadata(sheet, item.extractedSection, item.extractedDept, item.extractedYear);

      // Parse Grid & Slots
      const gridResult = parseTimetableGrid(sheet);

      // Parse Subject / Faculty Reference Table
      const subjectTable = parseSubjectFacultyTable(sheet);

      // Resolve Abbreviations and Map to Subjects
      const sessions = resolveTimetableEntries(gridResult.rawEntries, subjectTable, metadata);

      parsedTimetables.push({
        sheetName: sheet.sheetName,
        metadata,
        periods: gridResult.periodSlots,
        sessions,
        subjectTable,
        validationWarnings: gridResult.warnings
      });
    }

    // 4. Validate all extracted entities
    const validationReport = validateParsedTimetables(parsedTimetables, sheets.length);

    // 5. Persist to SQL if requested and valid
    let insertedCounts;
    if (persist && validationReport.isValid) {
      insertedCounts = updateDatabaseWithTimetables(parsedTimetables, timetableId);
    }

    return {
      success: validationReport.isValid,
      validationReport,
      timetables: parsedTimetables,
      insertedCounts
    };
  } catch (error: any) {
    console.error('Timetable workbook ingestion error:', error);
    return {
      success: false,
      validationReport: {
        totalSheetsFound: 0,
        validTimetableSheetsCount: 0,
        detectedSheetNames: [],
        totalSessionsExtracted: 0,
        totalResolvedSessions: 0,
        unresolvedSessions: [],
        warnings: [],
        errors: [error.message || 'Fatal error during timetable ingestion.'],
        isValid: false
      },
      timetables: [],
      error: error.message || 'Failed to process timetable workbook.'
    };
  }
}
