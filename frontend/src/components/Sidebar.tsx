import React, { useState } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
  UserCheck,
  X
} from 'lucide-react';
import { User } from '../../../shared/types';
import { ROLE_CONFIGS } from '../config/roleProfiles';

export type NavSection =
  | 'role-profile'
  | 'dashboard'
  | 'wizard'
  | 'timetable'
  | 'conflicts'
  | 'preferences'
  | 'hierarchy'
  | 'faculty'
  | 'students'
  | 'courses'
  | 'activities'
  | 'infrastructure'
  | 'calendar'
  | 'availability'
  | 'fet'
  | 'publishing'
  | 'audit'
  | 'users'
  | 'settings';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  conflictsCount: number;
  currentUser: User | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  conflictsCount,
  currentUser,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const role = currentUser?.role || 'TIMETABLE_COORDINATOR';
  const roleConfig = ROLE_CONFIGS[role] || ROLE_CONFIGS.TIMETABLE_COORDINATOR;
  const navGroups = roleConfig.navGroups;

  const renderNavContent = (collapsed: boolean, isMobile: boolean) => (
    <div className="flex flex-col justify-between h-full">
      {/* Top Header */}
      <div className="p-3.5 border-b border-[#D8E6ED] flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2 pl-1">
            {isMobile && (
              <img src="/Apollo Vector image.svg" alt="Apollo" className="h-6 w-auto object-contain" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2582A1]">
              {roleConfig.shortTitle}
            </span>
          </div>
        )}
        {isMobile ? (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-[#4A6375] hover:text-[#002E4E] hover:bg-[#F0F6F9]"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="p-1.5 rounded-lg text-[#4A6375] hover:text-[#002E4E] hover:bg-[#F0F6F9] transition-colors mx-auto"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Navigation Group Items */}
      <div className="p-2.5 overflow-y-auto space-y-4 flex-1">
        {navGroups.map(group => (
          <div key={group.title}>
            {!collapsed && (
              <div className="text-[9px] font-bold uppercase tracking-widest text-[#829BA8] px-2 mb-1.5">
                {group.title}
              </div>
            )}
            {collapsed && (
              <div className="w-full h-px bg-[#D8E6ED] my-2" />
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                const count = item.countKey === 'conflicts' ? conflictsCount : undefined;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectSection(item.id as NavSection);
                      if (isMobile && onCloseMobile) onCloseMobile();
                    }}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center ${
                      collapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-2.5'
                    } rounded-xl text-xs font-semibold transition-all text-left relative group ${
                      isActive
                        ? 'bg-[#2582A1] text-white shadow-xs'
                        : 'text-[#4A6375] hover:text-[#002E4E] hover:bg-[#F0F6F9]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? 'text-[#FDB931]' : 'text-[#829BA8] group-hover:text-[#2582A1]'
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!collapsed && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.badge && (
                          <span
                            className={`text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-[#FFF7E6] text-[#B27B08] border border-[#FFE4A8]'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {typeof count === 'number' && count > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#B91C1C] text-white">
                            {count}
                          </span>
                        )}
                      </div>
                    )}

                    {collapsed && typeof count === 'number' && count > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#B91C1C]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Role Profile Indicator at Bottom */}
      <div className="p-2.5 border-t border-[#D8E6ED] bg-[#F4F8FA]">
        <div
          onClick={() => {
            onSelectSection('role-profile');
            if (isMobile && onCloseMobile) onCloseMobile();
          }}
          className={`flex items-center cursor-pointer ${
            collapsed ? 'justify-center p-2' : 'justify-between p-2.5'
          } rounded-xl bg-white border border-[#D8E6ED] hover:border-[#2582A1] transition-colors`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FDB931] flex-shrink-0"></div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-[#002E4E] truncate max-w-[140px]">
                  {roleConfig.title}
                </div>
                <div className="text-[9px] text-[#2582A1] font-medium truncate">The Apollo University</div>
              </div>
            )}
          </div>
          {!collapsed && <Activity className="w-3.5 h-3.5 text-[#2582A1] flex-shrink-0" />}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar (Visible on screens >= lg) */}
      <aside
        className={`hidden lg:flex bg-white text-[#002E4E] flex-col justify-between h-[calc(100vh-6rem)] sticky top-20 rounded-2xl border border-[#D8E6ED] shadow-2xs transition-all duration-250 ease-in-out ${
          isCollapsed ? 'w-16 min-w-[4rem]' : 'w-60 min-w-[15rem]'
        }`}
      >
        {renderNavContent(isCollapsed, false)}
      </aside>

      {/* Mobile Slide-In Navigation Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex animate-fadeIn">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" 
            onClick={onCloseMobile} 
          />
          
          {/* Drawer Container */}
          <div className="relative w-72 max-w-[85vw] h-full bg-white text-[#002E4E] shadow-2xl z-10 animate-slideRight flex flex-col">
            {renderNavContent(false, true)}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
