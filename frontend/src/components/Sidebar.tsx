import React, { useState } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
  UserCheck
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
  | 'audit';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  conflictsCount: number;
  currentUser: User | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  conflictsCount,
  currentUser
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const role = currentUser?.role || 'TIMETABLE_COORDINATOR';
  const roleConfig = ROLE_CONFIGS[role] || ROLE_CONFIGS.TIMETABLE_COORDINATOR;

  const navGroups = roleConfig.navGroups;

  return (
    <aside
      className={`bg-white text-[#121316] flex flex-col justify-between h-[calc(100vh-6rem)] sticky top-20 rounded-xl border border-[#E8E7E3] shadow-2xs transition-all duration-250 ease-in-out ${
        isCollapsed ? 'w-16 min-w-[4rem]' : 'w-60 min-w-[15rem]'
      }`}
    >
      {/* Top Header with Collapse / Expand Toggle & Role Pill */}
      <div className="p-3 border-b border-[#E8E7E3] flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-1.5 pl-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B8E99]">
              {roleConfig.shortTitle}
            </span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="p-1.5 rounded-lg text-[#575A65] hover:text-[#121316] hover:bg-[#F6F5F2] transition-colors mx-auto"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Group Items */}
      <div className="p-2.5 overflow-y-auto space-y-4 flex-1">
        {navGroups.map(group => (
          <div key={group.title}>
            {!isCollapsed && (
              <div className="text-[9px] font-bold uppercase tracking-widest text-[#8B8E99] px-2 mb-1.5">
                {group.title}
              </div>
            )}
            {isCollapsed && (
              <div className="w-full h-px bg-[#E8E7E3] my-2" />
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                const count = item.countKey === 'conflicts' ? conflictsCount : undefined;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectSection(item.id as NavSection)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-1.5'
                    } rounded-lg text-xs font-medium transition-all text-left relative group ${
                      isActive
                        ? 'bg-[#121316] text-white font-semibold shadow-xs'
                        : 'text-[#575A65] hover:text-[#121316] hover:bg-[#F6F5F2]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? 'text-white' : 'text-[#575A65] group-hover:text-[#121316]'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCollapsed && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.badge && (
                          <span
                            className={`text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-[#F4F4F1] text-[#575A65] border border-[#E8E7E3]'
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

                    {/* Badge indicator on collapsed mode */}
                    {isCollapsed && typeof count === 'number' && count > 0 && (
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
      <div className="p-2.5 border-t border-[#E8E7E3] bg-[#FBFBFA]">
        <div
          onClick={() => onSelectSection('role-profile')}
          className={`flex items-center cursor-pointer ${
            isCollapsed ? 'justify-center p-2' : 'justify-between p-2'
          } rounded-lg bg-white border border-[#E8E7E3] hover:border-[#D1D0C9] transition-colors`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${roleConfig.avatarBg}`}></div>
            {!isCollapsed && (
              <div>
                <div className="text-[11px] font-semibold text-[#121316] truncate max-w-[120px]">
                  {roleConfig.title}
                </div>
                <div className="text-[9px] text-[#8B8E99]">Role Workspace</div>
              </div>
            )}
          </div>
          {!isCollapsed && <Activity className="w-3.5 h-3.5 text-[#575A65]" />}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
