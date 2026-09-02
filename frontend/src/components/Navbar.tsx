import React from 'react';
import { 
  Building2, 
  Calendar, 
  Sparkles, 
  Search, 
  ChevronDown,
  Command
} from 'lucide-react';
import { User, Timetable } from '../../../shared/types';

interface NavbarProps {
  currentUser: User | null;
  allUsers: User[];
  onSelectUser: (user: User) => void;
  activeTimetable: Timetable | null;
  onOpenWizard: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allUsers,
  onSelectUser,
  activeTimetable,
  onOpenWizard,
  searchQuery,
  onSearchChange
}) => {
  const statusLabel = activeTimetable ? activeTimetable.status.replace(/_/g, ' ') : 'NO SCHEDULE';
  const score = activeTimetable?.qualityScore?.overallScore ?? null;
  const hardScore = activeTimetable?.qualityScore?.hardConstraintSatisfaction ?? null;
  const conflictsCount = activeTimetable?.conflicts?.length ?? 0;

  // Helper to format user display name without duplicated parenthetical roles
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
    <header className="sticky top-0 z-40 bg-white border-b border-[#E8E7E3] mb-5 shadow-2xs">
      <div className="max-w-[1700px] mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Swiss Editorial Brand & Academic Term */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#121316] flex items-center justify-center text-white flex-shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#121316] text-sm tracking-tight whitespace-nowrap">
                  Metropolitan Timetable
                </span>
                <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-[#F4F4F1] text-[#575A65] border border-[#E8E7E3] whitespace-nowrap">
                  FET 6.0
                </span>
              </div>
              <p className="text-[11px] text-[#8B8E99] font-normal leading-none mt-0.5 whitespace-nowrap">
                Metropolitan Institute of Science & Technology
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
        <div className="hidden md:flex items-center w-72 lg:w-80 relative flex-shrink-0">
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

        {/* Right: Quality Indicator, Status, Smart Wizard, Role Switcher */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Quality Indicator (Real-Time) */}
          {activeTimetable && score !== null && (
            <div className="hidden sm:flex items-center gap-3 px-3 h-9 rounded-lg bg-[#F8F8F6] border border-[#E8E7E3] flex-shrink-0">
              <div className="text-right">
                <div className="text-[8px] uppercase tracking-wider text-[#8B8E99] font-bold leading-none">
                  Engine Quality
                </div>
                <div className="text-xs font-bold text-[#121316] flex items-center gap-1 mt-0.5 leading-none">
                  <span>{score}%</span>
                  {hardScore !== null && (
                    <span className="text-[10px] font-normal text-[#8B8E99]">({hardScore}% hard)</span>
                  )}
                </div>
              </div>
              {conflictsCount > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] whitespace-nowrap">
                  {conflictsCount} conflicts
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] whitespace-nowrap">
                  0 conflicts
                </span>
              )}
            </div>
          )}

          {/* Schedule Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-[11px] font-semibold bg-[#F5F5F3] text-[#121316] border border-[#E4E3DF] whitespace-nowrap flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#121316]"></span>
            {statusLabel}
          </div>

          {/* Smart Wizard CTA (Solid Obsidian Button) */}
          {currentUser?.role !== 'STUDENT' && currentUser?.role !== 'FACULTY' && (
            <button
              onClick={onOpenWizard}
              className="lux-btn lux-btn-primary text-xs h-9 px-3.5 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>Smart Wizard</span>
            </button>
          )}


          {/* User Role Switcher with Clean Formatting */}
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
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
