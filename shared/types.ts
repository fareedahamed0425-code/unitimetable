// ==========================================
// SHARED DOMAIN TYPES & INTERFACES
// ==========================================

export type RoleType = 
  | 'SUPER_ADMIN' 
  | 'UNIVERSITY_ADMIN' 
  | 'DEPARTMENT_ADMIN' 
  | 'TIMETABLE_COORDINATOR' 
  | 'FACULTY' 
  | 'STUDENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  departmentId?: string;
  facultyId?: string;
  teacherId?: string;
  studentId?: string;
  createdAt: string;
}

// ------------------------------------------
// University Hierarchy
// ------------------------------------------
export interface University {
  id: string;
  name: string;
  code: string;
  address?: string;
}

export interface Campus {
  id: string;
  universityId: string;
  name: string;
  code: string;
  location?: string;
}

export interface FacultyOrg {
  id: string;
  campusId: string;
  name: string;
  code: string;
  deanName?: string;
}

export interface Department {
  id: string;
  facultyId: string;
  name: string;
  code: string;
  headOfDepartment?: string;
}

export interface Program {
  id: string;
  departmentId: string;
  name: string;
  code: string;
  degree: string; // B.Tech, M.Tech, B.Sc, M.Sc, etc.
  totalSemesters: number;
}

export interface AcademicYear {
  id: string;
  universityId: string;
  name: string; // e.g., "2026-2027"
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface Semester {
  id: string;
  academicYearId: string;
  programId: string;
  semesterNumber: number; // 1, 2, 3, etc.
  name: string; // e.g. "Semester 3"
  isOdd: boolean;
}

export interface Batch {
  id: string;
  programId: string;
  academicYearId: string;
  name: string; // e.g. "Batch 2026-2030"
  startYear: number;
  totalStudents: number;
}

export interface Section {
  id: string;
  batchId: string;
  semesterId: string;
  name: string; // e.g. "Section A"
  studentCount: number;
}

export interface StudentGroup {
  id: string;
  sectionId: string;
  name: string; // e.g. "Group A1"
  studentCount: number;
}

export interface StudentSubgroup {
  id: string;
  groupId: string;
  name: string; // e.g. "Subgroup A1-Lab1"
  studentCount: number;
}

// ------------------------------------------
// Teachers & Students
// ------------------------------------------
export interface Teacher {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  departmentId: string;
  designation: string; // Professor, Assoc Prof, Asst Prof, Lecturer
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  minHoursPerDay: number;
  maxWorkingDaysPerWeek: number;
  minWorkingDaysPerWeek: number;
  maxConsecutiveHours: number;
  minRestHoursBetweenDays?: number;
  maxGapsPerDay: number;
  maxGapsPerWeek: number;
  homeRoomId?: string;
  homeBuildingId?: string;
  qualifications: string[]; // Subject / Course IDs qualified to teach
}

export interface Student {
  id: string;
  rollNumber: string;
  name: string;
  email: string;
  batchId: string;
  sectionId: string;
  groupId?: string;
  subgroupId?: string;
}

// ------------------------------------------
// Courses & Curriculum
// ------------------------------------------
export type CourseType = 
  | 'LECTURE' 
  | 'TUTORIAL' 
  | 'LABORATORY' 
  | 'PRACTICAL' 
  | 'SEMINAR' 
  | 'WORKSHOP' 
  | 'PROJECT' 
  | 'EXAMINATION' 
  | 'CUSTOM';

export interface Course {
  id: string;
  code: string; // e.g. "CS301"
  name: string; // e.g. "Database Management Systems"
  departmentId: string;
  programId: string;
  semesterNumber: number;
  credits: number;
  courseType: CourseType;
  lectureHoursPerWeek: number;
  tutorialHoursPerWeek: number;
  practicalHoursPerWeek: number;
  labHoursPerWeek: number;
  requiredRoomType: RoomType;
  requiredEquipment: string[]; // e.g. ["Projector", "GPU Workstations"]
}

// ------------------------------------------
// Activities (Fundamental Scheduling Units)
// ------------------------------------------
export type ActivityRelationType = 
  | 'SAME_STARTING_TIME' 
  | 'DIFFERENT_TIME' 
  | 'SAME_DAY' 
  | 'DIFFERENT_DAY' 
  | 'CONSECUTIVE' 
  | 'ORDERED' 
  | 'MIN_GAP' 
  | 'MAX_GAP' 
  | 'SAME_ROOM' 
  | 'DIFFERENT_ROOM';

export interface Activity {
  id: string;
  code: string;
  name: string;
  courseId: string;
  teacherIds: string[]; // Supports single or multiple co-teachers
  // Hierarchical target set: Section, Group, Subgroup or Combined Set
  sectionIds: string[];
  groupIds: string[];
  subgroupIds: string[];
  totalStudentCount: number;
  durationPeriods: number; // e.g., 1 period = 1 hr, 2 periods = 2 hr lab
  occurrencesPerWeek: number; // How many times this activity happens weekly
  activityType: CourseType;
  activityTag?: string; // e.g. "Core", "Elective", "CommonLecture"
  requiredRoomType: RoomType;
  requiredEquipment: string[];
  preferredRoomId?: string;
  preferredBuildingId?: string;
  preferredDayOfWeek?: number; // 0=Mon, 1=Tue...
  preferredPeriodIndex?: number;
  isLocked?: boolean; // For semi-automatic scheduling
  lockedDay?: number;
  lockedPeriod?: number;
  lockedRoomId?: string;
  splitFromActivityId?: string; // For split/combined activities
}

export interface ActivityRelation {
  id: string;
  name: string;
  relationType: ActivityRelationType;
  activityIds: string[]; // List of activities involved
  minGapPeriods?: number;
  maxGapPeriods?: number;
  isHardConstraint: boolean;
  weight: number; // 0 to 100
}

// ------------------------------------------
// Physical Resources & Time System
// ------------------------------------------
export type RoomType = 
  | 'CLASSROOM' 
  | 'LECTURE_HALL' 
  | 'LABORATORY' 
  | 'COMPUTER_LAB' 
  | 'SEMINAR_ROOM' 
  | 'WORKSHOP' 
  | 'AUDITORIUM' 
  | 'EXAMINATION_HALL' 
  | 'CUSTOM';

export interface Building {
  id: string;
  campusId: string;
  name: string;
  code: string;
  totalFloors: number;
}

export interface Room {
  id: string;
  buildingId: string;
  name: string;
  code: string;
  floor: number;
  capacity: number;
  roomType: RoomType;
  equipment: string[];
  isAccessible: boolean;
  departmentId?: string; // Optional ownership
}

export interface TimeSlot {
  id: string;
  dayOfWeek: number; // 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday
  dayName: string;   // "Monday", "Tuesday", etc.
  periodIndex: number; // 0, 1, 2, 3...
  startTime: string;  // "09:00"
  endTime: string;    // "10:00"
  isBreak: boolean;   // true for lunch/recess
  label?: string;     // e.g. "Morning Slot 1" or "Lunch Break"
}

// ------------------------------------------
// Availability System
// ------------------------------------------
export type AvailabilityState = 
  | 'UNAVAILABLE' 
  | 'DISCOURAGED' 
  | 'NEUTRAL' 
  | 'PREFERRED' 
  | 'STRONGLY_PREFERRED';

export interface EntityAvailability {
  entityType: 'TEACHER' | 'STUDENT_SECTION' | 'STUDENT_GROUP' | 'ROOM' | 'ACTIVITY';
  entityId: string;
  dayOfWeek: number;
  periodIndex: number;
  state: AvailabilityState;
}

// ------------------------------------------
// Smart Preferences & Constraint Configuration
// ------------------------------------------
export type PreferencePriority = 
  | 'HARD' 
  | 'VERY_HIGH' 
  | 'HIGH' 
  | 'MEDIUM' 
  | 'LOW';

export type PreferenceCategory = 
  | 'STUDENT' 
  | 'TEACHER' 
  | 'ROOM' 
  | 'UNIVERSITY';

export interface SmartPreferenceRule {
  id: string;
  category: PreferenceCategory;
  ruleCode: string; 
  // e.g., 'MINIMIZE_GAPS', 'AVOID_AFTER_5PM', 'MAX_CONSECUTIVE_CLASSES', 
  // 'PREFER_AFTERNOON_LABS', 'AVOID_SATURDAY', 'SPREAD_WORKLOAD', 'MAX_ROOM_UTILIZATION'
  name: string;
  description: string;
  targetScope: 'GLOBAL' | 'DEPARTMENT' | 'TEACHER' | 'STUDENT_GROUP' | 'COURSE';
  targetId?: string;
  parameterValue?: number | string | boolean | any;
  priority: PreferencePriority;
  weight: number; // 0 - 100 (Hard = 100)
  isEnabled: boolean;
}

export type PresetProfileType = 
  | 'STUDENT_FRIENDLY' 
  | 'FACULTY_FRIENDLY' 
  | 'ROOM_EFFICIENT' 
  | 'BALANCED' 
  | 'CUSTOM';

export interface PreferenceProfile {
  id: string;
  name: string;
  profileType: PresetProfileType;
  description: string;
  rules: SmartPreferenceRule[];
  nlPrompt?: string; // Natural-language prompt that generated it
  isDefault: boolean;
}

// ------------------------------------------
// Timetable Generation & Results
// ------------------------------------------
export type GenerationMode = 'AUTOMATIC' | 'SEMI_AUTOMATIC' | 'MANUAL';

export type GenerationJobStatus = 
  | 'QUEUED' 
  | 'RUNNING' 
  | 'OPTIMIZING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'CANCELLED';

export type TimetableStatus = 
  | 'DRAFT' 
  | 'GENERATED' 
  | 'UNDER_REVIEW' 
  | 'APPROVED' 
  | 'PUBLISHED' 
  | 'ARCHIVED';

export interface TimetableEntry {
  id: string;
  timetableId: string;
  activityId: string;
  activityName: string;
  courseCode: string;
  courseName: string;
  activityType: CourseType;
  teacherIds: string[];
  teacherNames: string[];
  sectionNames: string[];
  groupNames: string[];
  subgroupNames: string[];
  dayOfWeek: number;
  periodIndex: number;
  duration: number; // in periods
  roomId: string;
  roomName: string;
  buildingName: string;
  isLocked: boolean;
  satisfactionExplanation?: string;
  violatedSoftPreferences?: string[];
}

export interface QualityScore {
  overallScore: number;          // 0 - 100%
  hardConstraintSatisfaction: number; // Must be 100% for valid timetable
  softConstraintSatisfaction: number; // 0 - 100%
  teacherSatisfaction: number;   // 0 - 100%
  studentSatisfaction: number;   // 0 - 100%
  roomUtilization: number;       // 0 - 100%
  gapScore: number;              // 0 - 100%
  workloadBalance: number;       // 0 - 100%
  preferenceScore: number;       // 0 - 100%
  metrics: {
    totalActivitiesToSchedule: number;
    scheduledActivities: number;
    unallocatedActivities: number;
    hardViolationsCount: number;
    softViolationsCount: number;
    teacherIdleGapsCount: number;
    studentIdleGapsCount: number;
    roomChangesCount: number;
    buildingChangesCount: number;
  };
}

export type ConflictSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'WARNING';

export interface TimetableConflict {
  id: string;
  severity: ConflictSeverity;
  conflictType: 
    | 'TEACHER_COLLISION' 
    | 'STUDENT_COLLISION' 
    | 'ROOM_COLLISION' 
    | 'CAPACITY_VIOLATION' 
    | 'EQUIPMENT_VIOLATION' 
    | 'AVAILABILITY_VIOLATION' 
    | 'WORKLOAD_VIOLATION' 
    | 'GAP_VIOLATION' 
    | 'BUILDING_TRANSITION_VIOLATION' 
    | 'RELATION_VIOLATION' 
    | 'QUALIFICATION_VIOLATION';
  title: string;
  description: string;
  affectedActivityIds: string[];
  affectedTeacherIds: string[];
  affectedStudentGroupIds: string[];
  affectedRoomIds: string[];
  dayOfWeek: number;
  periodIndex: number;
  violatedConstraintRule: string;
  suggestedFix?: string;
}

export interface Timetable {
  id: string;
  academicYearId: string;
  departmentId?: string;
  name: string;
  version: number;
  status: TimetableStatus;
  generationMode: GenerationMode;
  profileId?: string;
  qualityScore?: QualityScore;
  entries: TimetableEntry[];
  conflicts: TimetableConflict[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface TimetableVersion {
  id: string;
  timetableId: string;
  versionNumber: number;
  name: string;
  status: TimetableStatus;
  qualityScore: QualityScore;
  totalEntries: number;
  conflictsCount: number;
  createdAt: string;
  createdBy: string;
  changeSummary: string;
}

export interface GenerationJob {
  id: string;
  timetableId: string;
  mode: GenerationMode;
  status: GenerationJobStatus;
  progressPercent: number;
  currentStage: string;
  currentScore: number;
  bestScore: number;
  conflictsCount: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface FeasibilityReport {
  isFeasible: boolean;
  criticalIssues: string[];
  warnings: string[];
  resourceBottlenecks: {
    resourceType: 'TEACHER' | 'ROOM' | 'TIME_SLOT' | 'EQUIPMENT';
    name: string;
    requiredHours: number;
    availableHours: number;
    deficit: number;
  }[];
  suggestions: string[];
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeValue?: string;
  afterValue?: string;
  timestamp: string;
}

// ------------------------------------------
// FET Interoperability
// ------------------------------------------
export interface FETParsedData {
  institutionName: string;
  comments?: string;
  days: string[];
  hours: string[];
  teachers: { name: string }[];
  years: { name: string; groups: { name: string; subgroups: { name: string }[] }[] }[];
  subjects: { name: string }[];
  activityTags: { name: string }[];
  activities: {
    id: number;
    teacherNames: string[];
    subjectName: string;
    activityTag?: string;
    studentYearNames: string[];
    duration: number;
    totalStudents: number;
  }[];
  buildings: { name: string }[];
  rooms: { name: string; buildingName?: string; capacity: number }[];
  timeConstraints: any[];
  spaceConstraints: any[];
}

export interface FETCompatibilityReport {
  fileName: string;
  supportedEntitiesCount: number;
  convertedEntitiesCount: number;
  unsupportedEntitiesCount: number;
  warnings: string[];
  details: {
    institutionName: string;
    daysCount: number;
    hoursCount: number;
    teachersCount: number;
    studentsYearsCount: number;
    subjectsCount: number;
    activityTagsCount: number;
    activitiesCount: number;
    buildingsCount: number;
    roomsCount: number;
    timeConstraintsCount: number;
    spaceConstraintsCount: number;
  };
}
