import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, NavSection } from './components/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { SmartWizardView } from './components/wizard/SmartWizardView';
import { TimetableExplorerView } from './components/timetable/TimetableExplorerView';
import { SmartPreferencesView } from './components/preferences/SmartPreferencesView';
import { ConflictInspectorView } from './components/conflicts/ConflictInspectorView';
import { AvailabilityMatrixView } from './components/availability/AvailabilityMatrixView';
import { ResourceManagementView } from './components/resources/ResourceManagementView';
import { FETInteroperabilityView } from './components/fet/FETInteroperabilityView';
import { PublishingAndAuditView } from './components/governance/PublishingAndAuditView';
import { RoleProfileRouter } from './components/roles/RoleProfileRouter';
import { api } from './api';
import { Room, Teacher, TimeSlot, Timetable, User } from '../../shared/types';
import { ROLE_CONFIGS } from './config/roleProfiles';

const TEST_USERS: User[] = [
  { id: 'user-super', name: 'Super Admin', email: 'admin@apollo.edu', role: 'SUPER_ADMIN', createdAt: new Date().toISOString() },
  { id: 'user-univ-admin', name: 'Dean Academic Affairs', email: 'dean@apollo.edu', role: 'UNIVERSITY_ADMIN', createdAt: new Date().toISOString() },
  { id: 'user-dept-admin', name: 'Dr. Alan Turing (HOD CSE)', email: 'hod.cse@apollo.edu', role: 'DEPARTMENT_ADMIN', createdAt: new Date().toISOString() },
  { id: 'user-coordinator', name: 'Prof. Ada Lovelace (Timetable Coordinator)', email: 'coordinator@apollo.edu', role: 'TIMETABLE_COORDINATOR', createdAt: new Date().toISOString() },
  { id: 'user-faculty', name: 'Dr. Grace Hopper', email: 'grace@apollo.edu', role: 'FACULTY', createdAt: new Date().toISOString() },
  { id: 'user-student', name: 'Alex Johnson (Student CSE 3-A)', email: 'alex.j@student.apollo.edu', role: 'STUDENT', createdAt: new Date().toISOString() }
];

export const App: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<NavSection>('role-profile');
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Core Data
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTimetable, setActiveTimetable] = useState<Timetable | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [calendar, setCalendar] = useState<TimeSlot[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [uList, tt, stats, tList, infra, cal] = await Promise.all([
        api.getUsers().catch(() => TEST_USERS),
        api.getActiveTimetable().catch(() => null),
        api.getAnalytics().catch(() => null),
        api.getTeachers().catch(() => []),
        api.getInfrastructure().catch(() => ({ buildings: [], rooms: [] })),
        api.getCalendar().catch(() => [])
      ]);

      const activeUsers = uList && uList.length > 0 ? uList : TEST_USERS;
      setUsers(activeUsers);
      
      const defaultUser = activeUsers[3] || activeUsers[0]; // Timetable Coordinator or Super Admin
      setCurrentUser(defaultUser);
      
      const roleConfig = ROLE_CONFIGS[defaultUser.role] || ROLE_CONFIGS.TIMETABLE_COORDINATOR;
      setCurrentSection((roleConfig.defaultSection as NavSection) || 'role-profile');

      setActiveTimetable(tt);
      setAnalytics(stats);
      setTeachers(tList || []);
      setRooms(infra?.rooms || []);
      setCalendar(cal || []);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setUsers(TEST_USERS);
      setCurrentUser(TEST_USERS[3]);
      setCurrentSection('role-profile');
    }
  };

  const handleRefreshData = async () => {
    const [tt, stats] = await Promise.all([
      api.getActiveTimetable(),
      api.getAnalytics()
    ]);
    setActiveTimetable(tt);
    setAnalytics(stats);
  };

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    const roleConfig = ROLE_CONFIGS[user.role] || ROLE_CONFIGS.TIMETABLE_COORDINATOR;
    setCurrentSection((roleConfig.defaultSection as NavSection) || 'role-profile');
    setIsWizardOpen(false);
  };

  const conflictsCount = activeTimetable?.conflicts?.length || 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col w-full overflow-x-hidden">
      {/* Dynamic Streamlined Navbar */}
      <Navbar
        currentUser={currentUser}
        allUsers={users}
        onSelectUser={handleSelectUser}
        activeTimetable={activeTimetable}
        analytics={analytics}
        onOpenWizard={() => {
          setIsWizardOpen(true);
          setCurrentSection('wizard');
        }}
        onOpenPublishing={() => {
          setCurrentSection('publishing');
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNavigate={(s) => setCurrentSection(s as NavSection)}
      />

      {/* Main Container with min-w-0 to prevent horizontal scroll */}
      <div className="flex-1 w-full max-w-[1700px] mx-auto px-4 md:px-6 pb-8 flex gap-5 overflow-x-hidden">
        {/* Left Dynamic Role Sidebar */}
        <Sidebar
          currentSection={currentSection}
          onSelectSection={s => {
            setCurrentSection(s);
            if (s === 'wizard') setIsWizardOpen(true);
            else setIsWizardOpen(false);
          }}
          conflictsCount={conflictsCount}
          currentUser={currentUser}
        />

        {/* Center Content Workspace with min-w-0 to constrain wide tables/grids */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          {currentSection === 'role-profile' && (
            <RoleProfileRouter
              currentUser={currentUser}
              activeTimetable={activeTimetable}
              analytics={analytics}
              teachers={teachers}
              onOpenWizard={() => {
                setIsWizardOpen(true);
                setCurrentSection('wizard');
              }}
              onNavigate={(s) => setCurrentSection(s as NavSection)}
              onOpenPublishing={() => setCurrentSection('publishing')}
            />
          )}

          {currentSection === 'dashboard' && (
            <DashboardView
              analytics={analytics}
              activeTimetable={activeTimetable}
              onOpenWizard={() => {
                setIsWizardOpen(true);
                setCurrentSection('wizard');
              }}
              onNavigate={(s) => setCurrentSection(s as NavSection)}
            />
          )}

          {currentSection === 'wizard' && (
            <SmartWizardView
              onFinish={() => {
                handleRefreshData();
                setCurrentSection('timetable');
              }}
              onNavigateToTimetable={() => {
                handleRefreshData();
                setCurrentSection('timetable');
              }}
            />
          )}

          {currentSection === 'timetable' && (
            <TimetableExplorerView
              timetable={activeTimetable}
              teachers={teachers}
              rooms={rooms}
              calendar={calendar}
              onRefresh={handleRefreshData}
            />
          )}

          {currentSection === 'conflicts' && (
            <ConflictInspectorView
              conflicts={activeTimetable?.conflicts || []}
              onNavigateToGrid={() => setCurrentSection('timetable')}
            />
          )}

          {currentSection === 'preferences' && (
            <SmartPreferencesView />
          )}

          {currentSection === 'availability' && (
            <AvailabilityMatrixView />
          )}

          {(currentSection === 'hierarchy' ||
            currentSection === 'faculty' ||
            currentSection === 'students' ||
            currentSection === 'courses' ||
            currentSection === 'activities' ||
            currentSection === 'infrastructure' ||
            currentSection === 'calendar') && (
            <ResourceManagementView initialTab={currentSection as any} />
          )}

          {currentSection === 'fet' && (
            <FETInteroperabilityView />
          )}

          {(currentSection === 'publishing' || currentSection === 'audit') && (
            <PublishingAndAuditView
              activeTimetable={activeTimetable}
              onRefresh={handleRefreshData}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
