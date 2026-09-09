import React, { useState } from 'react';
import {
  Users,
  Lock,
  Unlock,
  Sparkles,
  AlertTriangle,
  School,
  Settings,
  ShieldCheck,
  Building2,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { User, Timetable } from '../../../../shared/types';

interface SuperAdminProfileViewProps {
  currentUser: User | null;
  activeTimetable: Timetable | null;
  analytics: any;
  onOpenWizard: () => void;
  onNavigate: (section: string) => void;
}

export const SuperAdminProfileView: React.FC<SuperAdminProfileViewProps> = ({
  currentUser,
  activeTimetable,
  analytics,
  onOpenWizard,
  onNavigate
}) => {
  const [isLocked, setIsLocked] = useState(false);

  return (
    <div className="space-y-6 max-w-full animate-fadeIn pb-12">
      {/* Super Admin High-Level Banner */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#D8E6ED] shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[#FFF7E6] text-[#B27B08] border border-[#FFE4A8]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Root Governance Console
              </span>
              <span className="text-xs font-semibold text-[#2582A1]">ID: {currentUser?.id || 'admin-root'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#002E4E]">
              Super Admin Control Console
            </h1>
            <p className="text-xs md:text-sm text-[#4A6375] max-w-2xl leading-relaxed">
              Global university platform governance, multi-department timetable generation, cohort structure oversight, and root safety administration.
            </p>
          </div>

          {/* Quick System Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                isLocked
                  ? 'bg-[#FFF7E6] text-[#B27B08] border-[#FFE4A8] shadow-xs'
                  : 'bg-[#F4F8FA] hover:bg-[#EBF3F7] text-[#002E4E] border-[#D8E6ED]'
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <Unlock className="w-3.5 h-3.5 text-[#2582A1]" />}
              <span>{isLocked ? 'Master System Locked' : 'System Unlocked'}</span>
            </button>

            <button
              onClick={onOpenWizard}
              className="lux-btn lux-btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FDB931]" />
              <span>Launch AI Wizard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary University Management Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Module 1: Timetable & Scheduling */}
        <div className="bg-white rounded-2xl p-6 border border-[#D8E6ED] shadow-sm flex flex-col justify-between hover:border-[#2582A1] transition-all">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F4F8] text-[#2582A1] border border-[#C4E2EC] flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#002E4E]">Timetable Explorer</h3>
              <p className="text-xs text-[#4A6375] mt-1 leading-relaxed">
                Inspect 4-year departmental timetables, execute manual or AI-assisted swaps, and manage room allocations.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('timetable')}
            className="mt-5 lux-btn lux-btn-primary w-full text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Open Timetable Grid</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Module 2: Conflict Diagnostics */}
        <div className="bg-white rounded-2xl p-6 border border-[#D8E6ED] shadow-sm flex flex-col justify-between hover:border-[#2582A1] transition-all">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#002E4E]">Conflict Diagnostics</h3>
              <p className="text-xs text-[#4A6375] mt-1 leading-relaxed">
                Detect and resolve faculty double-bookings, classroom capacity mismatches, and multi-department clashes.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('conflicts')}
            className="mt-5 lux-btn w-full text-xs font-bold py-2 rounded-xl text-[#002E4E] hover:bg-[#F4F8FA] border-[#D8E6ED] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Review Active Conflicts</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#2582A1]" />
          </button>
        </div>

        {/* Module 3: Cohort & Section Manager */}
        <div className="bg-white rounded-2xl p-6 border border-[#D8E6ED] shadow-sm flex flex-col justify-between hover:border-[#2582A1] transition-all">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F4F8] text-[#2582A1] border border-[#C4E2EC] flex items-center justify-center font-bold">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#002E4E]">Cohort & Section Hierarchy</h3>
              <p className="text-xs text-[#4A6375] mt-1 leading-relaxed">
                Partition students into sections across CSE, AI&DS, AI&ML, and Cyber Security with designated class mentors.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('hierarchy')}
            className="mt-5 lux-btn w-full text-xs font-bold py-2 rounded-xl text-[#002E4E] hover:bg-[#F4F8FA] border-[#D8E6ED] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Manage Academic Cohorts</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#2582A1]" />
          </button>
        </div>

        {/* Module 4: Faculty Directory */}
        <div className="bg-white rounded-2xl p-6 border border-[#D8E6ED] shadow-sm flex flex-col justify-between hover:border-[#2582A1] transition-all">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F4F8] text-[#2582A1] border border-[#C4E2EC] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#002E4E]">Faculty Directory & Workload</h3>
              <p className="text-xs text-[#4A6375] mt-1 leading-relaxed">
                Manage professor assignments, working hours, multi-department sharing, and ingest faculty rosters from PDF.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('faculty')}
            className="mt-5 lux-btn w-full text-xs font-bold py-2 rounded-xl text-[#002E4E] hover:bg-[#F4F8FA] border-[#D8E6ED] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Open Faculty Directory</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#2582A1]" />
          </button>
        </div>

        {/* Module 5: Infrastructure & Venues */}
        <div className="bg-white rounded-2xl p-6 border border-[#D8E6ED] shadow-sm flex flex-col justify-between hover:border-[#2582A1] transition-all">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F4F8] text-[#2582A1] border border-[#C4E2EC] flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#002E4E]">Infrastructure & Venues</h3>
              <p className="text-xs text-[#4A6375] mt-1 leading-relaxed">
                Configure smart classrooms, high-capacity auditoriums, specialized computer laboratories, and seating quotas.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('infrastructure')}
            className="mt-5 lux-btn w-full text-xs font-bold py-2 rounded-xl text-[#002E4E] hover:bg-[#F4F8FA] border-[#D8E6ED] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Configure Venues</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#2582A1]" />
          </button>
        </div>

        {/* Module 6: Academic Settings & Periods */}
        <div className="bg-white rounded-2xl p-6 border border-[#D8E6ED] shadow-sm flex flex-col justify-between hover:border-[#2582A1] transition-all">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F4F8] text-[#2582A1] border border-[#C4E2EC] flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#002E4E]">Time Periods & Reset Controls</h3>
              <p className="text-xs text-[#4A6375] mt-1 leading-relaxed">
                Customize period start/end timings, lunch breaks, sync daily schedules, and perform scoped data cleanups.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="mt-5 lux-btn w-full text-xs font-bold py-2 rounded-xl text-[#002E4E] hover:bg-[#F4F8FA] border-[#D8E6ED] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Open Academic Settings</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#2582A1]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminProfileView;
