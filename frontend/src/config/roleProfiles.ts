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
        title: 'GOVERNANCE & SYSTEM',
        items: [
          { id: 'role-profile', label: 'Platform Console', icon: ShieldAlert, badge: 'ROOT' },
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
          { id: 'infrastructure', label: 'Campus Venues & Labs', icon: Building }
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

  UNIVERSITY_ADMIN: {
    role: 'UNIVERSITY_ADMIN',
    title: 'Dean of Academic Affairs',
    shortTitle: 'Dean (Univ Admin)',
    badge: 'EXECUTIVE DEAN',
    badgeBg: 'bg-[#E8F4F8]',
    badgeText: 'text-[#2582A1]',
    badgeBorder: 'border-[#C4E2EC]',
    avatarBg: 'bg-[#2582A1]',
    avatarText: 'text-white',
    description: 'Executive academic leadership, cross-department scheduling alignment, institutional policy adherence, and formal publication sign-off.',
    departmentScope: 'The Apollo University Directorate',
    defaultSection: 'role-profile',
    navGroups: [
      {
        title: 'EXECUTIVE OVERSIGHT',
        items: [
          { id: 'role-profile', label: 'Executive Directorate', icon: Award, badge: 'DEAN' },
          { id: 'dashboard', label: 'Institutional Metrics', icon: LayoutDashboard },
          { id: 'timetable', label: 'Master University Grid', icon: CalendarDays },
          { id: 'publishing', label: 'Publication & Approval', icon: ShieldCheck }
        ]
      },
      {
        title: 'ACADEMIC POLICIES',
        items: [
          { id: 'preferences', label: 'Institutional Constraints', icon: Sliders },
          { id: 'hierarchy', label: 'Faculties & Depts', icon: Network },
          { id: 'faculty', label: 'Faculty Workloads', icon: Users },
          { id: 'infrastructure', label: 'Auditoriums & Rooms', icon: Building }
        ]
      },
      {
        title: 'COMPLIANCE & AUDIT',
        items: [
          { id: 'conflicts', label: 'Conflict Registry', icon: AlertTriangle, countKey: 'conflicts' },
          { id: 'audit', label: 'Policy Audit Trail', icon: History }
        ]
      }
    ],
    headerMetrics: [
      {
        label: 'Quality Score',
        getValue: (ctx) => `${ctx.timetable?.qualityScore?.overallScore ?? 94}% Overall`,
        sublabel: '100% Hard Constraints'
      },
      {
        label: 'Term Status',
        getValue: () => 'Odd Semester (2026-27)',
        sublabel: 'Approval In Progress'
      }
    ],
    quickActions: [
      { id: 'approve', label: 'Approve & Publish', icon: ShieldCheck, variant: 'primary', onClickAction: 'OPEN_PUBLISHING' },
      { id: 'download-report', label: 'Executive Report', icon: FileSpreadsheet, variant: 'outline', onClickAction: 'EXPORT_REPORT' }
    ]
  },

  DEPARTMENT_ADMIN: {
    role: 'DEPARTMENT_ADMIN',
    title: 'Head of Department (HOD)',
    shortTitle: 'HOD CSE',
    badge: 'DEPARTMENT HEAD',
    badgeBg: 'bg-[#FFF7E6]',
    badgeText: 'text-[#B27B08]',
    badgeBorder: 'border-[#FFE4A8]',
    avatarBg: 'bg-[#B27B08]',
    avatarText: 'text-white',
    description: 'Departmental curriculum execution, faculty teaching load balance, laboratory scheduling, and departmental timetable sign-off.',
    departmentScope: 'School of Technology • Dept. of CSE',
    defaultSection: 'role-profile',
    navGroups: [
      {
        title: 'DEPARTMENT COCKPIT',
        items: [
          { id: 'role-profile', label: 'HOD Department Console', icon: Briefcase, badge: 'HOD' },
          { id: 'dashboard', label: 'Department Analytics', icon: LayoutDashboard },
          { id: 'timetable', label: 'Department Timetable', icon: CalendarDays },
          { id: 'conflicts', label: 'Department Conflicts', icon: AlertTriangle, countKey: 'conflicts' }
        ]
      },
      {
        title: 'TEACHING & CURRICULUM',
        items: [
          { id: 'faculty', label: 'CSE Faculty & Teaching Loads', icon: Users },
          { id: 'courses', label: 'CSE Courses & Syllabi', icon: BookOpen },
          { id: 'activities', label: 'Lectures & Lab Batches', icon: Layers },
          { id: 'students', label: 'CSE Cohorts & Sections', icon: GraduationCap }
        ]
      },
      {
        title: 'RESOURCES & PREFERENCES',
        items: [
          { id: 'infrastructure', label: 'Department Labs & Classrooms', icon: Building },
          { id: 'availability', label: 'Faculty Availability', icon: CheckSquare },
          { id: 'preferences', label: 'Department Preferences', icon: Sliders }
        ]
      }
    ],
    headerMetrics: [
      {
        label: 'Dept Workload',
        getValue: () => '92% Balanced',
        sublabel: '12 Faculty Members'
      },
      {
        label: 'CSE Labs',
        getValue: () => '100% Allocated',
        sublabel: 'Comp Lab 1, 2, AI Center'
      }
    ],
    quickActions: [
      { id: 'signoff', label: 'Sign Off Dept Schedule', icon: ShieldCheck, variant: 'primary', onClickAction: 'OPEN_PUBLISHING' },
      { id: 'load-balance', label: 'Manage Faculty Loads', icon: Users, variant: 'outline', onClickAction: 'NAVIGATE_FACULTY' }
    ]
  },

  TIMETABLE_COORDINATOR: {
    role: 'TIMETABLE_COORDINATOR',
    title: 'Timetable Coordinator',
    shortTitle: 'Coordinator (Architect)',
    badge: 'SOLVER ARCHITECT',
    badgeBg: 'bg-[#E8F4F8]',
    badgeText: 'text-[#2582A1]',
    badgeBorder: 'border-[#C4E2EC]',
    avatarBg: 'bg-[#2582A1]',
    avatarText: 'text-white',
    description: 'Constraint satisfaction modeling, simulated annealing optimization, conflict root-cause resolution, and FET XML synchronization.',
    departmentScope: 'Apollo Central Timetabling Directorate',
    defaultSection: 'dashboard',
    navGroups: [
      {
        title: 'OPTIMIZATION ENGINE',
        items: [
          { id: 'dashboard', label: 'Solver Overview', icon: LayoutDashboard },
          { id: 'wizard', label: 'Smart Wizard (AI)', icon: Sparkles, badge: 'AI' },
          { id: 'timetable', label: 'Interactive Timetable Grid', icon: CalendarDays },
          { id: 'conflicts', label: 'Conflict Resolver', icon: AlertTriangle, countKey: 'conflicts' },
          { id: 'role-profile', label: 'Architect Settings', icon: Sliders }
        ]
      },
      {
        title: 'CONSTRAINT REPERTOIRE',
        items: [
          { id: 'preferences', label: 'Smart Preferences & Rules', icon: Sliders },
          { id: 'availability', label: 'Multi-Entity Availability', icon: CheckSquare },
          { id: 'activities', label: 'Activity Links & Splits', icon: Layers },
          { id: 'calendar', label: 'Time Slots & Breaks', icon: Clock }
        ]
      },
      {
        title: 'INTEROPERABILITY & VERSIONS',
        items: [
          { id: 'fet', label: 'FET XML Hub', icon: FileCode },
          { id: 'publishing', label: 'Versions & Diffing', icon: ShieldCheck },
          { id: 'audit', label: 'Audit Trail', icon: History }
        ]
      }
    ],
    headerMetrics: [
      {
        label: 'Optimization Engine',
        getValue: (ctx) => `${ctx.timetable?.qualityScore?.overallScore ?? 94}% Overall`,
        sublabel: 'Active Solver Evaluation'
      },
      {
        label: 'FET Core',
        getValue: () => 'Simulated Annealing',
        sublabel: 'Temperature: 0.05'
      }
    ],
    quickActions: [
      { id: 'wizard', label: 'Open Smart Wizard', icon: Sparkles, variant: 'primary', onClickAction: 'OPEN_WIZARD' },
      { id: 'solve-again', label: 'Re-Anneal Schedule', icon: Zap, variant: 'accent', onClickAction: 'QUICK_RESOLVE' }
    ]
  },

  FACULTY: {
    role: 'FACULTY',
    title: 'Faculty / Professor',
    shortTitle: 'Prof. Grace Hopper',
    badge: 'ACADEMIC FACULTY',
    badgeBg: 'bg-[#E8F4F8]',
    badgeText: 'text-[#1C6982]',
    badgeBorder: 'border-[#B8DCE8]',
    avatarBg: 'bg-[#1C6982]',
    avatarText: 'text-white',
    description: 'Personalized teaching schedule, lecture venue guidance, slot availability submissions, syllabus progress, and student group rosters.',
    departmentScope: 'School of Technology • Dept. of CSE',
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
          { id: 'courses', label: 'My Assigned Courses', icon: BookOpen },
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
        label: 'Today\'s Classes',
        getValue: () => '3 Lectures Scheduled',
        sublabel: 'Next at 11:00 AM (Room 302)'
      }
    ],
    quickActions: [
      { id: 'download-ical', label: 'Export to Calendar (iCal)', icon: Download, variant: 'primary', onClickAction: 'EXPORT_ICAL' },
      { id: 'request-leave', label: 'Submit Availability', icon: CheckSquare, variant: 'outline', onClickAction: 'NAVIGATE_AVAILABILITY' }
    ]
  },

  STUDENT: {
    role: 'STUDENT',
    title: 'Undergraduate Student',
    shortTitle: 'Alex Johnson (Student)',
    badge: 'STUDENT COHORT',
    badgeBg: 'bg-[#FFF7E6]',
    badgeText: 'text-[#002E4E]',
    badgeBorder: 'border-[#FDB931]',
    avatarBg: 'bg-[#002E4E]',
    avatarText: 'text-white',
    description: 'Student routine explorer, daily lecture venues, gap/lunch hour indicators, course instructor contacts, and exam schedules.',
    departmentScope: 'The Apollo University • B.Tech CSE (Sec A)',
    defaultSection: 'role-profile',
    navGroups: [
      {
        title: 'STUDENT ROUTINE',
        items: [
          { id: 'role-profile', label: 'Student Portal & Today', icon: GraduationCap, badge: 'TODAY' },
          { id: 'timetable', label: 'Section A Timetable', icon: CalendarDays }
        ]
      },
      {
        title: 'CAMPUS RESOURCES',
        items: [
          { id: 'courses', label: 'Semester Courses & Credits', icon: BookOpen },
          { id: 'faculty', label: 'Course Instructors Directory', icon: Users },
          { id: 'infrastructure', label: 'Campus Map & Free Rooms', icon: Building },
          { id: 'calendar', label: 'Academic Slots & Breaks', icon: Clock }
        ]
      }
    ],
    headerMetrics: [
      {
        label: 'Section',
        getValue: () => 'CSE 3-A (Group A1)',
        sublabel: '6 Courses • 2 Labs'
      },
      {
        label: 'Today\'s Routine',
        getValue: () => '4 Lectures • 1 Lab',
        sublabel: 'Lunch Break at 1:00 PM'
      }
    ],
    quickActions: [
      { id: 'download-routine', label: 'Download My Routine (PDF)', icon: Download, variant: 'primary', onClickAction: 'EXPORT_ROUTINE' },
      { id: 'view-grid', label: 'Full Timetable Grid', icon: CalendarDays, variant: 'outline', onClickAction: 'NAVIGATE_TIMETABLE' }
    ]
  }
};
