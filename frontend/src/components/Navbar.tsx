import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  Sparkles, 
  Search, 
  ChevronDown,
  Command,
  UserCheck,
  ShieldAlert,
  GraduationCap,
  Briefcase,
  Sliders,
  ShieldCheck,
  Download,
  FileSpreadsheet,
  Zap,
  CheckCircle2,
  X,
  ExternalLink,
  Layers
} from 'lucide-react';
import { User, Timetable } from '../../../shared/types';
import { ROLE_CONFIGS } from '../config/roleProfiles';

interface NavbarProps {
  currentUser: User | null;
  allUsers: User[];
  onSelectUser: (user: User) => void;
  activeTimetable: Timetable | null;
  analytics: any;
  onOpenWizard: () => void;
  onOpenPublishing: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigate: (section: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allUsers,
  onSelectUser,
  activeTimetable,
  analytics,
  onOpenWizard,
  onOpenPublishing,
  searchQuery,
  onSearchChange,
  onNavigate
}) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const role = currentUser?.role || 'TIMETABLE_COORDINATOR';
  const roleConfig = ROLE_CONFIGS[role] || ROLE_CONFIGS.TIMETABLE_COORDINATOR;

  const statusLabel = activeTimetable ? activeTimetable.status.replace(/_/g, ' ') : 'NO SCHEDULE';
  const score = activeTimetable?.qualityScore?.overallScore ?? null;
  const hardScore = activeTimetable?.qualityScore?.hardConstraintSatisfaction ?? null;
  const conflictsCount = activeTimetable?.conflicts?.length ?? 0;

  // Helper to format user display name
  const formatUser = (user: User | null) => {
    if (!user) return { name: 'User', role: 'Viewer' };
    const cleanName = user.name.replace(/\s*\([^)]*\)/g, '').trim();
    const cleanRole = user.role
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
    return { name: cleanName, role: cleanRole };
  };

  const currentDisplay = formatUser(currentUser);

  const handleQuickAction = (actionKey: string) => {
    switch (actionKey) {
      case 'OPEN_WIZARD':
        onOpenWizard();
        break;
      case 'OPEN_PUBLISHING':
        onOpenPublishing();
        break;
      case 'NAVIGATE_TIMETABLE':
        onNavigate('timetable');
        break;
      case 'NAVIGATE_FACULTY':
        onNavigate('faculty');
        break;
      case 'NAVIGATE_AVAILABILITY':
        onNavigate('availability');
        break;
      case 'EXPORT_ICAL':
        alert(`Exporting personal schedule for ${currentDisplay.name} as .ics calendar file...`);
        break;
      case 'EXPORT_ROUTINE':
        alert(`Generating verified student class routine PDF for ${currentDisplay.name}...`);
        break;
      case 'EXPORT_FET':
        window.open('/api/fet/export/xml', '_blank');
        break;
      case 'QUICK_RESOLVE':
        onOpenWizard();
        break;
      default:
        break;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E8E7E3] mb-5 shadow-2xs">
      <div className="max-w-[1700px] mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Role-Specific Academic Brand & Term */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${roleConfig.avatarBg}`}>
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#121316] text-sm tracking-tight whitespace-nowrap">
                  Metropolitan Timetable
                </span>
                <span className={`text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border whitespace-nowrap ${roleConfig.badgeBg} ${roleConfig.badgeText} ${roleConfig.badgeBorder}`}>
                  {roleConfig.badge}
                </span>
              </div>
              <p className="text-[11px] text-[#8B8E99] font-normal leading-none mt-0.5 whitespace-nowrap">
                {roleConfig.departmentScope}
              </p>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-[#E8E7E3] flex-shrink-0">
            <span className="text-[10px] font-bold text-[#8B8E99] tracking-wider uppercase whitespace-nowrap">
              TERM:
            </span>
            <span className="text-xs font-semibold text-[#121316] bg-[#F8F8F6] px-2.5 py-1.5 rounded-md border border-[#E8E7E3] flex items-center gap-1.5 whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-[#575A65]" />
              2026–2027 (Odd Semester)
            </span>
          </div>
        </div>

        {/* Middle: Architectural Search Field */}
        <div className="hidden md:flex items-center w-64 lg:w-72 relative flex-shrink-0">
          <Search className="w-3.5 h-3.5 text-[#8B8E99] absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search courses, faculty, venues..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="lux-input pl-9 pr-14 text-xs py-1.5 h-9 bg-[#F9F9F8] border-[#E8E7E3] focus:bg-white transition-all text-[#121316] placeholder:text-[#8B8E99]"
          />
          <div className="absolute right-2.5 flex items-center gap-0.5 text-[9px] text-[#8B8E99] font-medium bg-white px-1.5 py-0.5 rounded border border-[#E8E7E3] pointer-events-none">
            <Command className="w-2.5 h-2.5" /> K
          </div>
        </div>

        {/* Right: Dynamic Role Metrics, Role Actions & Persona Switcher */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Dynamic Role Metrics Pill */}
          {roleConfig.headerMetrics.slice(0, 1).map((m, idx) => (
            <div key={idx} className="hidden lg:flex items-center gap-2 px-3 h-9 rounded-lg bg-[#F8F8F6] border border-[#E8E7E3] flex-shrink-0">
              <div className="text-right">
                <div className="text-[8px] uppercase tracking-wider text-[#8B8E99] font-bold leading-none">
                  {m.label}
                </div>
                <div className="text-xs font-bold text-[#121316] mt-0.5 leading-none">
                  {m.getValue({ user: currentUser, timetable: activeTimetable, analytics })}
                </div>
              </div>
            </div>
          ))}

          {/* Schedule Status Badge (or Conflict Indicator) */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-[11px] font-semibold bg-[#F5F5F3] text-[#121316] border border-[#E4E3DF] whitespace-nowrap flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#121316]"></span>
            {statusLabel}
          </div>

          {/* Role-Specific Quick Action Buttons */}
          {roleConfig.quickActions.slice(0, 1).map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.onClickAction)}
                className={`text-xs h-9 px-3.5 rounded-lg font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all shadow-xs flex-shrink-0 ${
                  action.variant === 'primary'
                    ? 'bg-[#121316] hover:bg-black text-white'
                    : action.variant === 'accent'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-white hover:bg-[#F9F9F8] text-[#121316] border border-[#E8E7E3]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{action.label}</span>
              </button>
            );
          })}

          {/* Role Persona Switcher Pill / Profile Trigger */}
          <div className="flex items-center pl-2 border-l border-[#E8E7E3] flex-shrink-0">
            <div className="relative flex items-center bg-[#F8F8F6] border border-[#E8E7E3] rounded-lg h-9 overflow-hidden hover:border-[#D1D0C9] transition-colors">
              <select
                className="w-full h-full text-xs font-semibold text-[#121316] bg-transparent outline-none cursor-pointer pl-3 pr-8 appearance-none"
                value={currentUser?.id || ''}
                onChange={e => {
                  const u = allUsers.find(user => user.id === e.target.value);
                  if (u) onSelectUser(u);
                }}
              >
                {allUsers.map(user => {
                  const info = formatUser(user);
                  return (
                    <option key={user.id} value={user.id}>
                      {info.name} • {info.role}
                    </option>
                  );
                })}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown className="w-3.5 h-3.5 text-[#8B8E99]" />
              </div>
            </div>

            {/* Profile Drawer Button */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              title="View Active Role Profile"
              className={`w-9 h-9 ml-2 rounded-lg flex items-center justify-center font-bold text-xs ${roleConfig.avatarBg} ${roleConfig.avatarText} hover:opacity-90 transition-opacity flex-shrink-0 shadow-2xs`}
            >
              {currentDisplay.name.charAt(0)}
            </button>
          </div>
        </div>
      </div>

      {/* Role Profile Drawer / Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#E8E7E3] shadow-xl max-w-lg w-full p-6 space-y-5 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base ${roleConfig.avatarBg} ${roleConfig.avatarText}`}>
                  {currentDisplay.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#121316]">{currentDisplay.name}</h2>
                    <span className={`text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border ${roleConfig.badgeBg} ${roleConfig.badgeText} ${roleConfig.badgeBorder}`}>
                      {roleConfig.badge}
                    </span>
                  </div>
                  <p className="text-xs text-[#8B8E99]">{currentUser?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1.5 rounded-lg text-[#8B8E99] hover:text-[#121316] hover:bg-[#F4F4F1] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#F9F9F8] border border-[#E8E7E3] space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B8E99]">Role Scope & Responsibilities</div>
              <p className="text-xs text-[#575A65] leading-relaxed">
                {roleConfig.description}
              </p>
              <div className="pt-2 border-t border-[#E8E7E3] text-[11px] text-[#121316] font-medium">
                Scope: <strong>{roleConfig.departmentScope}</strong>
              </div>
            </div>

            {/* Quick Switch Persona Buttons */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B8E99]">Switch Role Profile</div>
              <div className="grid grid-cols-2 gap-2">
                {allUsers.map(user => {
                  const uRoleConfig = ROLE_CONFIGS[user.role] || ROLE_CONFIGS.TIMETABLE_COORDINATOR;
                  const isSelected = user.id === currentUser?.id;
                  const info = formatUser(user);
                  return (
                    <button
                      key={user.id}
                      onClick={() => {
                        onSelectUser(user);
                        setIsProfileModalOpen(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#121316] text-white border-[#121316]'
                          : 'bg-white hover:bg-[#F9F9F8] border-[#E8E7E3] text-[#121316]'
                      }`}
                    >
                      <div className="text-[11px] font-bold truncate">{info.name}</div>
                      <div className={`text-[9px] font-medium truncate ${isSelected ? 'text-slate-300' : 'text-[#8B8E99]'}`}>
                        {uRoleConfig.shortTitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setIsProfileModalOpen(false);
                  onNavigate('role-profile');
                }}
                className="w-full py-2.5 rounded-xl bg-[#121316] text-white text-xs font-semibold hover:bg-black transition-colors flex items-center justify-center gap-2"
              >
                <span>Open Detailed {roleConfig.shortTitle} Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
