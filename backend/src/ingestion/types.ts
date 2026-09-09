/**
 * Types and interfaces for the Institutional Timetable Ingestion Engine
 */

export interface RawTimetableSheet {
  sheetName: string;
  matrix: string[][];
  rawRows: any[][];
  merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }>;
}

export interface TimetableMetadata {
  institutionName: string;
  schoolName: string;
  timetableTitle: string;
  effectiveFrom: string;
  classTeacher: string;
  roomNumber: string;
  refNumber: string;
  issueNumber: string;
  date: string;
  revision: string;
  revisionDate: string;
  course: string;
  department: string;
  year: string;
  semester: string;
  academicYear: string;
  resolvedSectionName: string;
  resolvedDeptCode: string;
  resolvedYearNumber: number;
}

export interface TimePeriodSlot {
  periodNumber: number;
  periodLabel: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  isLunch: boolean;
  colIndex: number;
}

export interface RawGridEntry {
  dayName: string;
  dayOfWeek: number; // 0=Mon, 1=Tue, ..., 5=Sat
  periodNumber: number;
  periodLabel: string;
  startTime: string;
  endTime: string;
  colIndex: number;
  rawValue: string;
  normalizedValue: string;
  isBreak: boolean;
  isLunch: boolean;
}

export interface SubjectFacultyEntry {
  slNo: number;
  subjectCode: string;
  subjectName: string;
  normalizedSubjectName: string;
  acronyms: string[];
  facultyNames: string[];
  facultyPhones: string[];
  hoursPerWeek: number;
  rawFaculty: string;
  rawPhone: string;
  isLab: boolean;
  isElective: boolean;
}

export interface ResolvedTimetableSession {
  dayOfWeek: number;
  dayName: string;
  periodIndex: number;
  periodNumber: number;
  periodLabel: string;
  startTime: string;
  endTime: string;
  duration: number; // number of periods (e.g. 1 for 1hr, 2 for 2hr lab)
  rawValue: string;
  normalizedValue: string;
  subjectCode: string;
  subjectName: string;
  activityType: 'LECTURE' | 'LABORATORY' | 'TUTORIAL' | 'SEMINAR' | 'MENTORING' | 'SPORTS' | 'CLUB_ACTIVITY' | 'CRT' | 'PLACEMENT_TRAINING' | 'LIBRARY' | 'MOOC' | 'OTHER';
  teacherNames: string[];
  teacherPhones: string[];
  roomCode: string;
  sectionNames: string[];
  isResolved: boolean;
  resolutionConfidence: number; // 0 to 1
  resolutionNotes?: string;
}

export interface ParsedTimetableEntity {
  sheetName: string;
  metadata: TimetableMetadata;
  periods: TimePeriodSlot[];
  sessions: ResolvedTimetableSession[];
  subjectTable: SubjectFacultyEntry[];
  validationWarnings: string[];
}

export interface ValidationReport {
  totalSheetsFound: number;
  validTimetableSheetsCount: number;
  detectedSheetNames: string[];
  totalSessionsExtracted: number;
  totalResolvedSessions: number;
  unresolvedSessions: Array<{ sheet: string; day: string; period: string; rawValue: string }>;
  warnings: string[];
  errors: string[];
  isValid: boolean;
}

export interface IngestionResult {
  success: boolean;
  validationReport: ValidationReport;
  timetables: ParsedTimetableEntity[];
  insertedCounts?: {
    sections: number;
    courses: number;
    teachers: number;
    rooms: number;
    activities: number;
    timetableEntries: number;
    timeSlotsUpserted?: number;
  };
  error?: string;
}
