import {
  Activity,
  ActivityRelation,
  EntityAvailability,
  Room,
  SmartPreferenceRule,
  Teacher,
  TimeSlot
} from '../../../shared/types';

export interface ScheduleSlot {
  dayOfWeek: number;
  periodIndex: number;
  roomId: string;
}

export interface ActivityAssignment {
  activityId: string;
  dayOfWeek: number;
  periodIndex: number;
  duration: number;
  roomId: string;
  isLocked: boolean;
  scoreContribution?: number;
  explanation?: string;
  violations?: string[];
}

export interface TimetableProblemContext {
  activities: Activity[];
  teachers: Map<string, Teacher>;
  rooms: Map<string, Room>;
  timeSlots: TimeSlot[]; // Only non-break time slots
  allTimeSlots: TimeSlot[]; // Including breaks
  availability: EntityAvailability[];
  relations: ActivityRelation[];
  preferences: SmartPreferenceRule[];
  lockedAssignments?: ActivityAssignment[];
  maxDays: number;
  maxPeriodsPerDay: number;
}

export interface VariableDomain {
  activityId: string;
  validSlots: ScheduleSlot[];
}

export interface EngineProgressCallback {
  (progress: {
    stage: string;
    percent: number;
    currentScore: number;
    bestScore: number;
    conflicts: number;
  }): void;
}
