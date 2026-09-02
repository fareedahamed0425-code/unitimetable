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
import { api } from './api';
import { Room, Teacher, TimeSlot, Timetable, User } from '../../shared/types';

const TEST_USERS: User[] = [
  { id: 'user-super', name: 'Super Admin', email: 'admin@mist.edu', role: 'SUPER_ADMIN', createdAt: new Date().toISOString() },
  { id: 'user-univ-admin', name: 'Dean Academic Affairs', email: 'dean@mist.edu', role: 'UNIVERSITY_ADMIN', createdAt: new Date().toISOString() },
  { id: 'user-dept-admin', name: 'Dr. Alan Turing (HOD CSE)', email: 'hod.cse@mist.edu', role: 'DEPARTMENT_ADMIN', createdAt: new Date().toISOString() },
  { id: 'user-coordinator', name: 'Prof. Ada Lovelace (Timetable Coordinator)', email: 'coordinator@mist.edu', role: 'TIMETABLE_COORDINATOR', createdAt: new Date().toISOString() },
  { id: 'user-faculty', name: 'Dr. Grace Hopper', email: 'grace@mist.edu', role: 'FACULTY', createdAt: new Date().toISOString() },
  { id: 'user-student', name: 'Alex Johnson (Student CSE 3-A)', email: 'alex.j@student.mist.edu', role: 'STUDENT', createdAt: new Date().toISOString() }
];

export const App: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');
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
      
      const coordinator = activeUsers.find(u => u.role === 'TIMETABLE_COORDINATOR') || activeUsers[0];
      setCurrentUser(coordinator);
      
      setActiveTimetable(tt);
      setAnalytics(stats);
      setTeachers(tList || []);
      setRooms(infra?.rooms || []);
      setCalendar(cal || []);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setUsers(TEST_USERS);
      setCurrentUser(TEST_USERS[3]);
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

  const conflictsCount = activeTimetable?.conflicts?.length || 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        allUsers={users}
        onSelectUser={(u) => {
          setCurrentUser(u);
          if (u && (u.role === 'STUDENT' || u.role === 'FACULTY')) {
            if (!['dashboard', 'timetable'].includes(currentSection)) {
              setCurrentSection('dashboard');
              setIsWizardOpen(false);
            }
          }
        }}
        activeTimetable={activeTimetable}
        onOpenWizard={() => {
          setIsWizardOpen(true);
          setCurrentSection('wizard');
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Container */}
      <div className="flex-1 max-w-[1700px] w-full mx-auto px-6 pb-8 flex gap-6">
        {/* Left Sidebar */}
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

        {/* Center Content Workspace */}
        <main className="flex-1 overflow-y-auto">
          {currentSection === 'dashboard' && (
            <DashboardView
              analytics={analytics}
              activeTimetable={activeTimetable}
              onOpenWizard={() => {
                setIsWizardOpen(true);
                setCurrentSection('wizard');
              }}
              onNavigate={setCurrentSection}
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
