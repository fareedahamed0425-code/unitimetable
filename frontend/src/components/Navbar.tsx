import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  Sparkles, 
  Search, 
  ChevronDown,
  Command,
  X,
  ExternalLink,
  ShieldCheck,
  Download,
  FileCode
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

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E8E7E3] mb-4 shadow-2xs">
      <div className="w-full max-w-[1700px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
        {/* Left: Brand + Role Badge */}
        <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${roleConfig.avatarBg}`}>
            <Building2 className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-[#121316] text-sm tracking-tight truncate hidden sm:inline">
              Metropolitan Timetable
            </span>
            <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border whitespace-nowrap ${roleConfig.badgeBg} ${roleConfig.badgeText} ${roleConfig.badgeBorder}`}>
              {roleConfig.shortTitle}
            </span>
          </div>
        </div>

        {/* Center: Search Field */}
        <div className="flex-1 max-w-xs md:max-w-md mx-2 min-w-0">
          <div className="relative flex items-center w-full">
            <Search className="w-3.5 h-3.5 text-[#8B8E99] absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search courses, teachers, rooms..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="lux-input w-full pl-8 pr-10 text-xs h-8 bg-[#F9F9F8] border-[#E8E7E3] focus:bg-white text-[#121316] placeholder:text-[#8B8E99] rounded-lg"
            />
            <div className="absolute right-2 hidden sm:flex items-center gap-0.5 text-[9px] text-[#8B8E99] font-medium bg-white px-1.5 py-0.5 rounded border border-[#E8E7E3] pointer-events-none">
              <Command className="w-2.5 h-2.5" /> K
            </div>
          </div>
        </div>

        {/* Right: Status Dot + Persona Selector & Profile Modal Trigger */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Term Pill (Visible on md+) */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F8F8F6] border border-[#E8E7E3] text-[11px] font-medium text-[#575A65]">
            <Calendar className="w-3 h-3 text-[#8B8E99]" />
            <span>Odd Sem 2026–27</span>
          </div>

          {/* Quick Action Button for Admin / Coordinator / Student */}
          {currentUser?.role !== 'STUDENT' && currentUser?.role !== 'FACULTY' ? (
            <button
              onClick={onOpenWizard}
              className="lux-btn lux-btn-primary text-xs h-8 px-3 flex items-center gap-1.5 whitespace-nowrap rounded-lg"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Smart Wizard</span>
            </button>
          ) : currentUser?.role === 'FACULTY' ? (
            <button
              onClick={() => onNavigate('availability')}
              className="lux-btn text-xs h-8 px-3 bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 flex items-center gap-1.5 whitespace-nowrap rounded-lg"
            >
              <span>Submit Leave</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('timetable')}
              className="lux-btn text-xs h-8 px-3 bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 flex items-center gap-1.5 whitespace-nowrap rounded-lg"
            >
              <span>My Routine</span>
            </button>
          )}

          {/* Role Persona Switcher Dropdown */}
          <div className="relative flex items-center bg-[#F8F8F6] border border-[#E8E7E3] rounded-lg h-8 overflow-hidden hover:border-[#D1D0C9] transition-colors">
            <select
              className="text-xs font-semibold text-[#121316] bg-transparent outline-none cursor-pointer pl-2.5 pr-7 h-full appearance-none max-w-[140px] sm:max-w-[190px] truncate"
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
                    {info.name} ({user.role.replace(/_/g, ' ')})
                  </option>
                );
              })}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown className="w-3.5 h-3.5 text-[#8B8E99]" />
            </div>
          </div>

          {/* Profile Circle Avatar Modal Trigger */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            title="Open Role Details"
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${roleConfig.avatarBg} ${roleConfig.avatarText} hover:opacity-90 transition-opacity flex-shrink-0`}
          >
            {currentDisplay.name.charAt(0)}
          </button>
        </div>
      </div>

      {/* Role Profile Modal */}
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
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B8E99]">Switch Active Role Persona</div>
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
                <span>Open {roleConfig.shortTitle} Workspace</span>
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
