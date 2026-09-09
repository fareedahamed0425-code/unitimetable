import React from 'react';
import {
  ShieldAlert,
  GraduationCap,
  Briefcase,
  Sliders,
  UserCheck,
  BookOpen,
  LayoutDashboard,
  CalendarDays,
  AlertTriangle,
  FileCode,
  ShieldCheck,
  History,
  Building,
  Users,
  Layers,
  Network,
  Clock,
  CheckSquare,
  Sparkles,
  Award,
  CalendarCheck,
  FileSpreadsheet,
  Download,
  Flame,
  Zap,
  Coffee,
  Compass,
  FileText
} from 'lucide-react';
import { RoleType, User } from '../../../shared/types';

export interface RoleConfig {
  role: RoleType;
  title: string;
  shortTitle: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  avatarBg: string;
  avatarText: string;
  description: string;
  departmentScope?: string;
  defaultSection: string;
  navGroups: {
    title: string;
    items: {
      id: string;
      label: string;
      icon: React.ElementType;
      badge?: string;
      countKey?: 'conflicts' | 'pending' | 'classesToday';
    }[];
  }[];
  headerMetrics: {
    label: string;
    getValue: (ctx: { user: User | null; timetable: any; analytics: any }) => string;
    sublabel?: string;
  }[];
  quickActions: {
    id: string;
    label: string;
    icon: React.ElementType;
    variant: 'primary' | 'secondary' | 'accent' | 'outline';
    onClickAction: string; // Action identifier handled by App
  }[];
}

export const ROLE_CONFIGS: Record<RoleType, RoleConfig> = {
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    title: 'Super Administrator',
    shortTitle: 'Super Admin',
    badge: 'PLATFORM ROOT',
    badgeBg: 'bg-[#EBF3F7]',
    badgeText: 'text-[#002E4E]',
    badgeBorder: 'border-[#CCDDE7]',
    avatarBg: 'bg-[#002E4E]',
    avatarText: 'text-white',
    description: 'Complete system-wide administrative control, multi-campus governance, infrastructure locks, and security management.',
    departmentScope: 'The Apollo University • Global Administration',
    defaultSection: 'role-profile',
    navGroups: [
      {
        title: 'GOVERNANCE & ACCESS',
        items: [
          { id: 'role-profile', label: 'Platform Console', icon: ShieldAlert, badge: 'ROOT' },
          { id: 'users', label: 'User & Role Access', icon: UserCheck, badge: 'AUTH' },
          { id: 'dashboard', label: 'Academic Overview', icon: LayoutDashboard },
          { id: 'wizard', label: 'Smart Wizard', icon: Sparkles, badge: 'AI' },
          { id: 'timetable', label: 'Global Timetable Grid', icon: CalendarDays },
          { id: 'conflicts', label: 'Conflict Center', icon: AlertTriangle, countKey: 'conflicts' }
        ]
      },
      {
        title: 'INSTITUTIONAL ASSETS',
        items: [
          { id: 'hierarchy', label: 'Campus Hierarchy', icon: Network },
          { id: 'faculty', label: 'Faculty Directory', icon: Users },
          { id: 'students', label: 'Student Cohorts', icon: GraduationCap },
          { id: 'courses', label: 'Courses & Syllabi', icon: BookOpen },
          { id: 'activities', label: 'Course Activities & Labs', icon: Layers },
          { id: 'infrastructure', label: 'Campus Venues & Labs', icon: Building },
          { id: 'calendar', label: 'Periods & Calendar', icon: Clock },
          { id: 'settings', label: 'Academic Settings (CRUD)', icon: Sliders, badge: 'ADMIN' },
          { id: 'availability', label: 'Faculty Workload Matrix', icon: CalendarCheck }
        ]
      },
      {
        title: 'ENGINE & COMPLIANCE',
        items: [
          { id: 'preferences', label: 'Global Constraints', icon: Sliders },
          { id: 'fet', label: 'FET XML Hub', icon: FileCode },
          { id: 'publishing', label: 'Publishing & Versions', icon: ShieldCheck },
          { id: 'audit', label: 'System Audit Logs', icon: History }
        ]
      }
    ],
    headerMetrics: [
      {
        label: 'Platform Status',
        getValue: () => '100% Operational',
        sublabel: 'FET Core 6.0 Active'
      },
      {
        label: 'System Load',
        getValue: (ctx) => `${ctx.analytics?.totalActivities ?? 48} Scheduled Units`,
        sublabel: 'Active System Units'
      }
    ],
    quickActions: [
      { id: 'wizard', label: 'Smart AI Solver', icon: Sparkles, variant: 'primary', onClickAction: 'OPEN_WIZARD' },
      { id: 'export-xml', label: 'Export FET XML', icon: FileCode, variant: 'outline', onClickAction: 'EXPORT_FET' }
    ]
  },

  FACULTY: {
    role: 'FACULTY',
    title: 'Faculty / Professor',
    shortTitle: 'Faculty Member',
    badge: 'ACADEMIC FACULTY',
    badgeBg: 'bg-[#E8F4F8]',
    badgeText: 'text-[#1C6982]',
    badgeBorder: 'border-[#B8DCE8]',
    avatarBg: 'bg-[#1C6982]',
    avatarText: 'text-white',
    description: 'Personalized teaching schedule, lecture venue guidance, slot availability submissions, syllabus progress, and student group rosters.',
    departmentScope: 'School of Technology • Academic Faculty',
    defaultSection: 'role-profile',
    navGroups: [
      {
        title: 'MY TEACHING DESK',
        items: [
          { id: 'role-profile', label: 'Faculty Home & Today', icon: UserCheck, badge: 'MY DESK' },
          { id: 'timetable', label: 'My Weekly Schedule', icon: CalendarDays },
          { id: 'availability', label: 'Submit Availability & Leave', icon: CheckSquare }
        ]
      },
      {
        title: 'ACADEMIC REFERENCES',
        items: [
          { id: 'courses', label: 'Assigned Courses & Labs', icon: BookOpen },
          { id: 'students', label: 'Student Cohorts', icon: GraduationCap },
          { id: 'infrastructure', label: 'Classrooms & Labs Lookup', icon: Building }
        ]
      }
    ],
    headerMetrics: [
      {
        label: 'Weekly Load',
        getValue: () => '14 Hours / Week',
        sublabel: 'Max Allowed: 16h'
      },
      {
        label: "Today's Classes",
        getValue: () => '3 Lectures Scheduled',
        sublabel: 'Next at 11:00 AM (Room 302)'
      }
    ],
    quickActions: [
      { id: 'download-ical', label: 'Export to Calendar (iCal)', icon: Download, variant: 'primary', onClickAction: 'EXPORT_ICAL' },
      { id: 'request-leave', label: 'Submit Availability', icon: CheckSquare, variant: 'outline', onClickAction: 'NAVIGATE_AVAILABILITY' }
    ]
  },

  // Fallback aliases mapped strictly to Admin or Faculty
  UNIVERSITY_ADMIN: null as any,
  DEPARTMENT_ADMIN: null as any,
  TIMETABLE_COORDINATOR: null as any,
  STUDENT: null as any
};

// Ensure fallback safely points to FACULTY
ROLE_CONFIGS.UNIVERSITY_ADMIN = ROLE_CONFIGS.SUPER_ADMIN;
ROLE_CONFIGS.DEPARTMENT_ADMIN = ROLE_CONFIGS.SUPER_ADMIN;
ROLE_CONFIGS.TIMETABLE_COORDINATOR = ROLE_CONFIGS.SUPER_ADMIN;
ROLE_CONFIGS.STUDENT = ROLE_CONFIGS.FACULTY;
