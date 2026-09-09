import React, { useState } from 'react';
import { 
  Calendar, 
  Sparkles, 
  Search, 
  Command,
  X,
  Menu,
  ShieldCheck,
  Download,
  FileCode,
  LogOut
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
  onToggleMobileMenu?: () => void;
  onLogout?: () => void;
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
  onNavigate,
  onToggleMobileMenu,
  onLogout
}) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const role = currentUser?.role || 'TIMETABLE_COORDINATOR';
  const roleConfig = ROLE_CONFIGS[role] || ROLE_CONFIGS.TIMETABLE_COORDINATOR;

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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#D8E6ED] w-full px-3 sm:px-4 md:px-6 py-2.5 transition-all">
      <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Menu Trigger + Brand Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Hamburger Drawer Trigger (Visible on < lg) */}
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-1.5 rounded-lg text-[#002E4E] hover:bg-[#F0F6F9] transition-colors focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Apollo University Vector Logo */}
          <div 
            onClick={() => onNavigate('role-profile')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none"
          >
            <div className="h-8 sm:h-9 w-auto flex items-center justify-center p-1 rounded-lg bg-white border border-[#D8E6ED] group-hover:border-[#2582A1] transition-all shadow-2xs">
              <img
                src="/Apollo Vector image.svg"
                alt="The Apollo University"
                className="h-6 sm:h-7 w-auto object-contain"
              />
            </div>
            
            <div className="hidden xs:block sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-base text-[#002E4E] tracking-tight group-hover:text-[#2582A1] transition-colors">
                  The Apollo University
                </span>
                <span className="hidden md:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FDB931] text-[#002E4E] uppercase tracking-wider">
                  FET Core
                </span>
              </div>
              <p className="text-[10px] text-[#4A6375] font-medium hidden sm:block -mt-0.5">
                Smart Academic Timetable Platform
              </p>
            </div>
          </div>
        </div>

        {/* Center: Desktop Global Live Search */}
        <div className="hidden sm:flex flex-1 max-w-xs md:max-w-md mx-2">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-[#829BA8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search faculty, subjects, rooms, batches..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="lux-input w-full pl-8 pr-8 text-xs h-8 sm:h-8.5 bg-[#F4F8FA] border-[#D8E6ED] text-[#002E4E] placeholder:text-[#829BA8] focus:bg-white rounded-lg"
            />
            {searchQuery ? (
              <button 
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#829BA8] hover:text-[#002E4E]"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono text-[#829BA8] bg-white border border-[#D8E6ED] rounded absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <Command className="w-2.5 h-2.5" /> K
              </kbd>
            )}
          </div>
        </div>

        {/* Right: Quick Actions, User Avatar & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Mobile Search Toggle Button */}
          <button
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="sm:hidden p-1.5 rounded-lg text-[#4A6375] hover:text-[#002E4E] hover:bg-[#F0F6F9]"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* AI Wizard Quick Button */}
          <button
            onClick={onOpenWizard}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FDB931] text-[#002E4E] hover:bg-[#EAA319] transition-all shadow-2xs active:scale-95"
            title="Generate AI Timetable"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#002E4E]" />
            <span className="hidden md:inline">AI Wizard</span>
          </button>



          {/* Profile Circle Avatar Modal Trigger */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            title="Open Role Details"
            className="w-8 sm:w-8.5 h-8 sm:h-8.5 rounded-lg flex items-center justify-center font-bold text-xs bg-[#002E4E] text-white hover:bg-[#2582A1] transition-colors flex-shrink-0 shadow-2xs cursor-pointer"
          >
            {currentDisplay.name.charAt(0)}
          </button>

          {/* Direct Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Expandable Search Bar */}
      {isMobileSearchOpen && (
        <div className="sm:hidden pt-2 pb-1 animate-fadeIn">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-[#829BA8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search subjects, faculty, batches..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="lux-input w-full pl-8 pr-8 text-xs h-8 bg-[#F4F8FA] border-[#D8E6ED] text-[#002E4E] rounded-lg"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Role Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#D8E6ED] shadow-xl max-w-lg w-full p-5 sm:p-6 space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 sm:w-12 h-11 sm:h-12 rounded-xl flex items-center justify-center font-bold text-base bg-[#002E4E] text-white flex-shrink-0">
                  {currentDisplay.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#002E4E]">{currentDisplay.name}</h3>
                  <div className="text-xs text-[#2582A1] font-semibold">{currentDisplay.role}</div>
                  <div className="text-[11px] text-[#4A6375] mt-0.5">{currentUser?.email}</div>
                </div>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1.5 rounded-lg text-[#829BA8] hover:text-[#002E4E] hover:bg-[#F0F6F9]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F0F6F9] border border-[#D8E6ED] space-y-1.5">
              <div className="text-xs font-bold text-[#002E4E]">{roleConfig.title}</div>
              <p className="text-xs text-[#4A6375] leading-relaxed">{roleConfig.description}</p>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-bold text-[#829BA8] uppercase tracking-wider">
                Switch Role Profile
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allUsers
                  .filter(u => u.role === 'SUPER_ADMIN' || u.role === 'FACULTY')
                  .map(user => {
                    const uInfo = formatUser(user);
                    const isSelected = user.id === currentUser?.id;
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          onSelectUser(user);
                          setIsProfileModalOpen(false);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-[#2582A1] bg-[#E8F4F8] shadow-xs'
                            : 'border-[#D8E6ED] bg-white hover:border-[#B8D4E1] hover:bg-[#F4F8FA]'
                        }`}
                      >
                        <div className="text-xs font-bold text-[#002E4E] truncate">{uInfo.name}</div>
                        <div className="text-[10px] text-[#2582A1] font-medium">{uInfo.role}</div>
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 border-t border-[#D8E6ED]">
              {onLogout && (
                <button
                  onClick={() => {
                    setIsProfileModalOpen(false);
                    onLogout();
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="lux-btn lux-btn-navy text-xs px-5 ml-auto"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
