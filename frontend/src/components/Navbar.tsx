import React, { useState } from 'react';
import { 
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#D8E6ED] mb-4 shadow-2xs">
      <div className="w-full max-w-[1700px] mx-auto px-4 md:px-6 h-15 flex items-center justify-between gap-3">
        {/* Left: Apollo University Vector Logo + Role Badge */}
        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <img
              src="/Apollo Vector image.svg"
              alt="The Apollo University"
              className="h-9 w-auto max-w-[150px] object-contain"
            />
            <div className="hidden sm:block border-l border-[#D8E6ED] pl-2.5">
              <span className="text-[13px] font-bold text-[#002E4E] tracking-tight leading-none block">
                Timetable Platform
              </span>
              <span className="text-[10px] text-[#2582A1] font-semibold tracking-wider uppercase">
                FET 6.0 ENGINE
              </span>
            </div>
          </div>

          <span className={`hidden md:inline-flex text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md border whitespace-nowrap ${roleConfig.badgeBg} ${roleConfig.badgeText} ${roleConfig.badgeBorder}`}>
            {roleConfig.shortTitle}
          </span>
        </div>

        {/* Center: Search Field */}
        <div className="flex-1 max-w-xs md:max-w-md mx-2 min-w-0">
          <div className="relative flex items-center w-full">
            <Search className="w-3.5 h-3.5 text-[#829BA8] absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search courses, professors, venues..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="lux-input w-full pl-8 pr-10 text-xs h-8.5 bg-[#F4F8FA] border-[#D8E6ED] focus:bg-white text-[#002E4E] placeholder:text-[#829BA8] rounded-lg"
            />
            <div className="absolute right-2 hidden sm:flex items-center gap-0.5 text-[9px] text-[#829BA8] font-medium bg-white px-1.5 py-0.5 rounded border border-[#D8E6ED] pointer-events-none">
              <Command className="w-2.5 h-2.5" /> K
            </div>
          </div>
        </div>

        {/* Right: Academic Term + Primary Action + Persona Switcher */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Term Pill (Visible on lg+) */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F0F6F9] border border-[#D8E6ED] text-[11px] font-semibold text-[#002E4E]">
            <Calendar className="w-3 h-3 text-[#2582A1]" />
            <span>Odd Sem 2026–27</span>
          </div>

          {/* Quick Action Button for Admin / Coordinator / Student with Apollo Colors */}
          {currentUser?.role !== 'STUDENT' && currentUser?.role !== 'FACULTY' ? (
            <button
              onClick={onOpenWizard}
              className="lux-btn lux-btn-gold text-xs h-8.5 px-3.5 flex items-center gap-1.5 whitespace-nowrap rounded-lg"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#002E4E]" />
              <span className="hidden sm:inline">Smart Wizard</span>
            </button>
          ) : currentUser?.role === 'FACULTY' ? (
            <button
              onClick={() => onNavigate('availability')}
              className="lux-btn text-xs h-8.5 px-3 bg-[#E8F4F8] text-[#2582A1] border border-[#C4E2EC] hover:bg-[#D3ECF4] flex items-center gap-1.5 whitespace-nowrap rounded-lg font-semibold"
            >
              <span>Submit Leave</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('timetable')}
              className="lux-btn text-xs h-8.5 px-3 bg-[#E8F4F8] text-[#2582A1] border border-[#C4E2EC] hover:bg-[#D3ECF4] flex items-center gap-1.5 whitespace-nowrap rounded-lg font-semibold"
            >
              <span>My Routine</span>
            </button>
          )}

          {/* Role Persona Switcher Dropdown */}
          <div className="relative flex items-center bg-[#F0F6F9] border border-[#D8E6ED] rounded-lg h-8.5 overflow-hidden hover:border-[#2582A1] transition-colors">
            <select
              className="text-xs font-semibold text-[#002E4E] bg-transparent outline-none cursor-pointer pl-2.5 pr-7 h-full appearance-none max-w-[140px] sm:max-w-[190px] truncate"
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
              <ChevronDown className="w-3.5 h-3.5 text-[#2582A1]" />
            </div>
          </div>

          {/* Profile Circle Avatar Modal Trigger */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            title="Open Role Details"
            className="w-8.5 h-8.5 rounded-lg flex items-center justify-center font-bold text-xs bg-[#002E4E] text-white hover:bg-[#2582A1] transition-colors flex-shrink-0 shadow-2xs"
          >
            {currentDisplay.name.charAt(0)}
          </button>
        </div>
      </div>

      {/* Role Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#D8E6ED] shadow-xl max-w-lg w-full p-6 space-y-5 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base bg-[#002E4E] text-white">
                  {currentDisplay.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#002E4E]">{currentDisplay.name}</h2>
                    <span className={`text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border ${roleConfig.badgeBg} ${roleConfig.badgeText} ${roleConfig.badgeBorder}`}>
                      {roleConfig.badge}
                    </span>
                  </div>
                  <p className="text-xs text-[#829BA8]">{currentUser?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1.5 rounded-lg text-[#829BA8] hover:text-[#002E4E] hover:bg-[#F0F6F9] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#2582A1]">Role Scope & Responsibilities</div>
              <p className="text-xs text-[#4A6375] leading-relaxed">
                {roleConfig.description}
              </p>
              <div className="pt-2 border-t border-[#D8E6ED] text-[11px] text-[#002E4E] font-medium">
                Scope: <strong>The Apollo University • {roleConfig.departmentScope}</strong>
              </div>
            </div>

            {/* Quick Switch Persona Buttons */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#829BA8]">Switch Active Role Persona</div>
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
                          ? 'bg-[#002E4E] text-white border-[#002E4E]'
                          : 'bg-white hover:bg-[#F4F8FA] border-[#D8E6ED] text-[#002E4E]'
                      }`}
                    >
                      <div className="text-[11px] font-bold truncate">{info.name}</div>
                      <div className={`text-[9px] font-medium truncate ${isSelected ? 'text-teal-200' : 'text-[#829BA8]'}`}>
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
                className="w-full py-2.5 rounded-xl bg-[#2582A1] text-white text-xs font-semibold hover:bg-[#1C6982] transition-colors flex items-center justify-center gap-2 shadow-xs"
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
