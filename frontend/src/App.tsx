import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Sparkles,
  AlertTriangle,
  UserCheck,
  Menu,
  Home
} from 'lucide-react';
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
import { UserManagementView } from './components/roles/UserManagementView';
import { AcademicSettingsView } from './components/AcademicSettingsView';
import { AuthPage } from './components/auth/AuthPage';
import { NotFoundPage } from './components/common/NotFoundPage';
import { api } from './api';
import { RoleType, Room, Teacher, TimeSlot, Timetable, User } from '../../shared/types';
import { ROLE_CONFIGS } from './config/roleProfiles';

// Native Browser Router Hook for React 19 (Zero library conflicts)
const useNativeRouter = () => {
  const [pathname, setPathname] = useState(() => (typeof window !== 'undefined' ? window.location.pathname : '/'));

  useEffect(() => {
    const onLocationChange = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  const navigate = useCallback((path: string, options?: { replace?: boolean }) => {
    if (typeof window !== 'undefined') {
      if (options?.replace) {
        window.history.replaceState(null, '', path);
      } else {
        window.history.pushState(null, '', path);
      }
      setPathname(path);
    }
  }, []);

  return { pathname, navigate };
};

import {
  ROLE_TO_SLUG,
  ALLOWED_ROLE_SLUGS,
  SLUG_TO_ROLE,
  SECTION_TO_SLUG,
  SLUG_TO_SECTION
} from './config/routes';

export const App: React.FC = () => {
  const { pathname, navigate } = useNativeRouter();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('apollo_auth_token') || localStorage.getItem('apollo_auth_user'));
  });

  const [currentSection, setCurrentSection] = useState<NavSection>('role-profile');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isRouteNotFound, setIsRouteNotFound] = useState<boolean>(false);

  // Core Data
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => api.getStoredUser());
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
      // Auto-migrate Saturday time slots (safe, non-destructive — uses ON CONFLICT DO NOTHING)
      api.migrateSaturday().catch(() => {});

      const [uList, tt, stats, tList, infra, cal, me] = await Promise.all([
        api.getUsers().catch(() => []),
        api.getActiveTimetable().catch(() => null),
        api.getAnalytics().catch(() => null),
        api.getTeachers().catch(() => []),
        api.getInfrastructure().catch(() => ({ buildings: [], rooms: [] })),
        api.getCalendar().catch(() => []),
        api.getMe().catch(() => null)
      ]);

      const activeUsers = uList && uList.length > 0 ? uList : (me ? [me] : []);
      setUsers(activeUsers);

      if (me) {
        setCurrentUser(me);
        setIsAuthenticated(true);
      } else if (localStorage.getItem('apollo_auth_user')) {
        const stored = api.getStoredUser();
        if (stored) {
          setCurrentUser(stored);
          setIsAuthenticated(true);
        }
      }

      setActiveTimetable(tt);
      setAnalytics(stats);
      setTeachers(tList || []);
      setRooms(infra?.rooms || []);
      setCalendar(cal || []);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsRouteNotFound(false);
    const roleSlug = user.role === 'SUPER_ADMIN' ? 'admin' : 'faculty';
    const roleConfig = ROLE_CONFIGS[user.role] || ROLE_CONFIGS.SUPER_ADMIN;
    const defaultSec = (roleConfig.defaultSection as NavSection) || 'role-profile';
    setCurrentSection(defaultSec);
    setIsWizardOpen(defaultSec === 'wizard');
    navigate(`/${roleSlug}/${SECTION_TO_SLUG[defaultSec] || 'profile'}`);
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setIsRouteNotFound(false);
    navigate('/');
  };

  // Sync state with URL path & Freeze legacy or invalid routes
  useEffect(() => {
    if (!isAuthenticated) return;

    const path = pathname.replace(/^\/+|\/+$/g, '');
    const parts = path.split('/').filter(Boolean);

    // Root path -> redirect to active role profile
    if (parts.length === 0) {
      setIsRouteNotFound(false);
      const roleSlug = currentUser?.role === 'SUPER_ADMIN' ? 'admin' : 'faculty';
      navigate(`/${roleSlug}/profile`, { replace: true });
      return;
    }

    const first = parts[0].toLowerCase();
    const second = parts[1] ? parts[1].toLowerCase() : null;

    // Check if route is a frozen legacy role or invalid path
    const frozenSlugs = ['student', 'dean', 'hod', 'coordinator', 'univ-admin', 'dept-admin'];
    if (frozenSlugs.includes(first) || (!ALLOWED_ROLE_SLUGS.has(first) && !SLUG_TO_SECTION[first])) {
      setIsRouteNotFound(true);
      return;
    }

    setIsRouteNotFound(false);

    if (ALLOWED_ROLE_SLUGS.has(first)) {
      const targetRole = SLUG_TO_ROLE[first] || 'FACULTY';
      const matchedUser = users.find(u => u.role === targetRole);
      if (matchedUser && (!currentUser || currentUser.role !== matchedUser.role)) {
        setCurrentUser(matchedUser);
      }

      if (second && SLUG_TO_SECTION[second]) {
        const targetSection = SLUG_TO_SECTION[second];
        setCurrentSection(targetSection);
        setIsWizardOpen(targetSection === 'wizard');
      } else {
        const roleConfig = ROLE_CONFIGS[targetRole] || ROLE_CONFIGS.SUPER_ADMIN;
        const defaultSec = (roleConfig.defaultSection as NavSection) || 'role-profile';
        setCurrentSection(defaultSec);
        setIsWizardOpen(defaultSec === 'wizard');
      }
    } else if (SLUG_TO_SECTION[first]) {
      const targetSection = SLUG_TO_SECTION[first];
      setCurrentSection(targetSection);
      setIsWizardOpen(targetSection === 'wizard');
      const roleSlug = currentUser?.role === 'SUPER_ADMIN' ? 'admin' : 'faculty';
      navigate(`/${roleSlug}/${SECTION_TO_SLUG[targetSection] || targetSection}`, { replace: true });
    }
  }, [pathname, users, isAuthenticated, currentUser]);

  const handleNavigate = (section: NavSection, userOverride?: User | null) => {
    setIsRouteNotFound(false);
    const targetUser = userOverride || currentUser;
    const roleSlug = targetUser?.role === 'SUPER_ADMIN' ? 'admin' : 'faculty';
    const sectionSlug = SECTION_TO_SLUG[section] || 'profile';
    setCurrentSection(section);
    setIsWizardOpen(section === 'wizard');
    setIsMobileDrawerOpen(false);
    navigate(`/${roleSlug}/${sectionSlug}`);
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
    const roleConfig = ROLE_CONFIGS[user.role] || ROLE_CONFIGS.SUPER_ADMIN;
    const defaultSec = (roleConfig.defaultSection as NavSection) || 'role-profile';
    handleNavigate(defaultSec, user);
  };

  const conflictsCount = activeTimetable?.conflicts?.length || 0;

  if (!isAuthenticated) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  // 404 / Access Restricted View for frozen or invalid URLs
  if (isRouteNotFound) {
    return (
      <NotFoundPage
        onGoHome={() => {
          setIsRouteNotFound(false);
          const roleSlug = currentUser?.role === 'SUPER_ADMIN' ? 'admin' : 'faculty';
          navigate(`/${roleSlug}/profile`);
        }}
        onLogout={handleLogout}
        attemptedPath={pathname}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F8FA] text-[#002E4E] flex flex-col w-full overflow-x-hidden">
      {/* Dynamic Streamlined Navbar */}
      <Navbar
        currentUser={currentUser}
        allUsers={users}
        onSelectUser={handleSelectUser}
        activeTimetable={activeTimetable}
        analytics={analytics}
        onOpenWizard={() => {
          handleNavigate('wizard');
        }}
        onOpenPublishing={() => {
          handleNavigate('publishing');
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNavigate={(s) => handleNavigate(s as NavSection)}
        onToggleMobileMenu={() => setIsMobileDrawerOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container with min-w-0 to prevent horizontal scroll */}
      <div className="flex-1 w-full max-w-[1700px] mx-auto px-3 sm:px-4 md:px-6 pb-20 lg:pb-8 flex gap-4 md:gap-5 overflow-x-hidden">
        {/* Left Dynamic Role Sidebar (Desktop Sticky + Mobile Drawer) */}
        <Sidebar
          currentSection={currentSection}
          onSelectSection={(s) => handleNavigate(s)}
          conflictsCount={conflictsCount}
          currentUser={currentUser}
          isOpenMobile={isMobileDrawerOpen}
          onCloseMobile={() => setIsMobileDrawerOpen(false)}
        />

        {/* Center Content Workspace */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          {currentSection === 'role-profile' && (
            <RoleProfileRouter
              currentUser={currentUser}
              activeTimetable={activeTimetable}
              analytics={analytics}
              teachers={teachers}
              onOpenWizard={() => {
                handleNavigate('wizard');
              }}
              onOpenPublishing={() => {
                handleNavigate('publishing');
              }}
              onNavigate={(s) => handleNavigate(s as NavSection)}
            />
          )}

          {currentSection === 'dashboard' && (
            <DashboardView
              activeTimetable={activeTimetable}
              analytics={analytics}
              onNavigate={(s) => handleNavigate(s as NavSection)}
              onOpenWizard={() => {
                handleNavigate('wizard');
              }}
            />
          )}

          {currentSection === 'wizard' && (
            <SmartWizardView
              isOpen={true}
              onClose={() => {
                handleNavigate('role-profile');
              }}
              onSuccess={() => {
                handleRefreshData();
                handleNavigate('timetable');
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
              timetable={activeTimetable}
              onNavigateToGrid={() => handleNavigate('timetable')}
              onRefresh={handleRefreshData}
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

          {currentSection === 'users' && (
            <UserManagementView
              currentUser={currentUser}
              onRefresh={handleRefreshData}
            />
          )}

          {currentSection === 'settings' && (
            <AcademicSettingsView />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Visible on screens < lg) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#D8E6ED] px-2 py-1.5 flex items-center justify-around shadow-lg">
        <button
          onClick={() => handleNavigate('role-profile')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-semibold transition-colors ${
            currentSection === 'role-profile' ? 'text-[#2582A1] bg-[#E8F4F8]' : 'text-[#4A6375] hover:text-[#002E4E]'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          <span>Profile</span>
        </button>
        
        <button
          onClick={() => handleNavigate('timetable')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-semibold transition-colors ${
            currentSection === 'timetable' ? 'text-[#2582A1] bg-[#E8F4F8]' : 'text-[#4A6375] hover:text-[#002E4E]'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span>Routine</span>
        </button>

        <button
          onClick={() => {
            handleNavigate('wizard');
          }}
          className="flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-bold text-[#002E4E] bg-[#FDB931] hover:bg-[#EAA319] shadow-xs active:scale-95 transition-all -mt-3 border-2 border-white"
        >
          <Sparkles className="w-5 h-5 text-[#002E4E]" />
          <span>Wizard</span>
        </button>

        <button
          onClick={() => handleNavigate('conflicts')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-semibold relative transition-colors ${
            currentSection === 'conflicts' ? 'text-[#2582A1] bg-[#E8F4F8]' : 'text-[#4A6375] hover:text-[#002E4E]'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
          <span>Conflicts</span>
          {conflictsCount > 0 && (
            <span className="absolute top-0.5 right-2 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
              {conflictsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-[10px] font-semibold text-[#4A6375] hover:text-[#002E4E]"
        >
          <Menu className="w-5 h-5" />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
