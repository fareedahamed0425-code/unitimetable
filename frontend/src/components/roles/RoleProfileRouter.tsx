import React from 'react';
import { User, Timetable, Teacher } from '../../../../shared/types';
import { SuperAdminProfileView } from './SuperAdminProfileView';
import { UniversityAdminProfileView } from './UniversityAdminProfileView';
import { DepartmentAdminProfileView } from './DepartmentAdminProfileView';
import { CoordinatorProfileView } from './CoordinatorProfileView';
import { FacultyProfileView } from './FacultyProfileView';
import { StudentProfileView } from './StudentProfileView';

interface RoleProfileRouterProps {
  currentUser: User | null;
  activeTimetable: Timetable | null;
  analytics: any;
  teachers: Teacher[];
  onOpenWizard: () => void;
  onNavigate: (section: any) => void;
  onOpenPublishing: () => void;
}

export const RoleProfileRouter: React.FC<RoleProfileRouterProps> = ({
  currentUser,
  activeTimetable,
  analytics,
  teachers,
  onOpenWizard,
  onNavigate,
  onOpenPublishing
}) => {
  const role = currentUser?.role || 'TIMETABLE_COORDINATOR';

  switch (role) {
    case 'SUPER_ADMIN':
      return (
        <SuperAdminProfileView
          currentUser={currentUser}
          activeTimetable={activeTimetable}
          analytics={analytics}
          onOpenWizard={onOpenWizard}
          onNavigate={onNavigate}
        />
      );

    case 'UNIVERSITY_ADMIN':
      return (
        <UniversityAdminProfileView
          currentUser={currentUser}
          activeTimetable={activeTimetable}
          analytics={analytics}
          onNavigate={onNavigate}
          onOpenPublishing={onOpenPublishing}
        />
      );

    case 'DEPARTMENT_ADMIN':
      return (
        <DepartmentAdminProfileView
          currentUser={currentUser}
          activeTimetable={activeTimetable}
          teachers={teachers}
          onNavigate={onNavigate}
          onOpenWizard={onOpenWizard}
        />
      );

    case 'TIMETABLE_COORDINATOR':
      return (
        <CoordinatorProfileView
          currentUser={currentUser}
          activeTimetable={activeTimetable}
          analytics={analytics}
          onOpenWizard={onOpenWizard}
          onNavigate={onNavigate}
        />
      );

    case 'FACULTY':
      return (
        <FacultyProfileView
          currentUser={currentUser}
          activeTimetable={activeTimetable}
          onNavigate={onNavigate}
        />
      );

    case 'STUDENT':
      return (
        <StudentProfileView
          currentUser={currentUser}
          activeTimetable={activeTimetable}
          onNavigate={onNavigate}
        />
      );

    default:
      return (
        <CoordinatorProfileView
          currentUser={currentUser}
          activeTimetable={activeTimetable}
          analytics={analytics}
          onOpenWizard={onOpenWizard}
          onNavigate={onNavigate}
        />
      );
  }
};

export default RoleProfileRouter;
