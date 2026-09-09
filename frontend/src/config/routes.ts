import { RoleType } from '../../../shared/types';
import { NavSection } from '../components/Sidebar';

// Only Admin and Faculty active roles
export const ROLE_TO_SLUG: Record<RoleType, string> = {
  SUPER_ADMIN: 'admin',
  FACULTY: 'faculty',
  UNIVERSITY_ADMIN: 'admin',
  DEPARTMENT_ADMIN: 'admin',
  TIMETABLE_COORDINATOR: 'admin',
  STUDENT: 'faculty'
};

export const ALLOWED_ROLE_SLUGS = new Set(['admin', 'super-admin', 'faculty']);

export const SLUG_TO_ROLE: Record<string, RoleType> = {
  admin: 'SUPER_ADMIN',
  'super-admin': 'SUPER_ADMIN',
  faculty: 'FACULTY'
};

export const SECTION_TO_SLUG: Record<NavSection, string> = {
  'role-profile': 'profile',
  dashboard: 'dashboard',
  wizard: 'wizard',
  timetable: 'timetable',
  conflicts: 'conflicts',
  preferences: 'preferences',
  availability: 'availability',
  hierarchy: 'hierarchy',
  faculty: 'faculty',
  students: 'students',
  courses: 'courses',
  activities: 'activities',
  infrastructure: 'infrastructure',
  calendar: 'calendar',
  fet: 'fet',
  publishing: 'publishing',
  audit: 'audit',
  users: 'users'
};

export const SLUG_TO_SECTION: Record<string, NavSection> = {
  profile: 'role-profile',
  console: 'role-profile',
  overview: 'role-profile',
  'role-profile': 'role-profile',
  dashboard: 'dashboard',
  wizard: 'wizard',
  timetable: 'timetable',
  routine: 'timetable',
  conflicts: 'conflicts',
  preferences: 'preferences',
  availability: 'availability',
  workload: 'availability',
  hierarchy: 'hierarchy',
  faculty: 'faculty',
  teachers: 'faculty',
  students: 'students',
  cohorts: 'students',
  courses: 'courses',
  activities: 'activities',
  infrastructure: 'infrastructure',
  venues: 'infrastructure',
  calendar: 'calendar',
  periods: 'calendar',
  fet: 'fet',
  publishing: 'publishing',
  versions: 'publishing',
  audit: 'audit',
  logs: 'audit',
  users: 'users',
  accounts: 'users',
  roles: 'users',
  access: 'users'
};
