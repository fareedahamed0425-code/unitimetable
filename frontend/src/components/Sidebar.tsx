import React, { useState } from 'react';
import {
  LayoutDashboard,
  Sparkles,
  CalendarDays,
  AlertTriangle,
  Sliders,
  Network,
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  Building,
  Clock,
  CheckSquare,
  FileCode,
  ShieldCheck,
  History,
  Activity,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

import { User } from '../../shared/types';

export type NavSection =
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

  const isRestricted = currentUser?.role === 'STUDENT' || currentUser?.role === 'FACULTY';

  const allNavGroups = [
    {
      title: 'SCHEDULE',
      items: [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        ...(isRestricted ? [] : [{ id: 'wizard', label: 'Smart Wizard', icon: Sparkles, badge: 'AI' }]),
        { id: 'timetable', label: 'Timetable Grid', icon: CalendarDays },
        ...(isRestricted ? [] : [{ id: 'conflicts', label: 'Conflict Center', icon: AlertTriangle, count: conflictsCount }])
      ]
    },
    {
      title: 'OPTIMIZATION',
      restricted: true,
      items: [
        { id: 'preferences', label: 'Smart Preferences', icon: Sliders },
        { id: 'availability', label: 'Availability Matrix', icon: CheckSquare }
      ]
    },
    {
      title: 'ACADEMIC STRUCTURE',
      restricted: true,
      items: [
        { id: 'hierarchy', label: 'University Hierarchy', icon: Network },
        { id: 'faculty', label: 'Faculty & Teachers', icon: Users },
        { id: 'students', label: 'Student Cohorts', icon: GraduationCap },
        { id: 'courses', label: 'Courses & Curriculum', icon: BookOpen },
        { id: 'activities', label: 'Activities & Labs', icon: Layers },
        { id: 'infrastructure', label: 'Venues & Rooms', icon: Building },
        { id: 'calendar', label: 'Periods & Slots', icon: Clock }
      ]
    },
    {
      title: 'INTEROPERABILITY',
      restricted: true,
      items: [
        { id: 'fet', label: 'FET XML Hub', icon: FileCode },
        { id: 'publishing', label: 'Publishing & Versions', icon: ShieldCheck },
        { id: 'audit', label: 'Audit Trail', icon: History }
      ]
    }
  ];

  // Filter out restricted groups for students and faculty
  const navGroups = allNavGroups.filter(group => !(isRestricted && group.restricted));

  return (
    <aside
      className={`bg-white text-[#121316] flex flex-col justify-between h-[calc(100vh-6rem)] sticky top-20 rounded-xl border border-[#E8E7E3] shadow-2xs transition-all duration-250 ease-in-out ${
        isCollapsed ? 'w-16 min-w-[4rem]' : 'w-60 min-w-[15rem]'
      }`}
    >
      {/* Top Header with Collapse / Expand Toggle */}
      <div className="p-3 border-b border-[#E8E7E3] flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B8E99] pl-1">
            Navigation
          </span>
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
                        {typeof item.count === 'number' && item.count > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#B91C1C] text-white">
                            {item.count}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Badge indicator on collapsed mode */}
                    {isCollapsed && typeof item.count === 'number' && item.count > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#B91C1C]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Minimalist Bottom Status */}
      <div className="p-2.5 border-t border-[#E8E7E3] bg-[#FBFBFA]">
        <div
          className={`flex items-center ${
            isCollapsed ? 'justify-center p-2' : 'justify-between p-2'
          } rounded-lg bg-white border border-[#E8E7E3]`}
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#121316]"></div>
            {!isCollapsed && (
              <div>
                <div className="text-[11px] font-semibold text-[#121316]">FET Core 6.0</div>
                <div className="text-[9px] text-[#8B8E99]">Engine Active</div>
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
