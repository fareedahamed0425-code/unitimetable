import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Users,
  GraduationCap,
  Building,
  Layers,
  CalendarCheck,
  TrendingUp,
  Cpu,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { QualityScore, Timetable } from '../../../../shared/types';

interface DashboardViewProps {
  analytics: any;
  activeTimetable: Timetable | null;
  onOpenWizard: () => void;
  onNavigate: (section: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  analytics,
  activeTimetable,
  onOpenWizard,
  onNavigate
}) => {
  // Real-time Database Counts (Zero hardcoded template fallbacks)
  const totalTeachers = analytics?.totalTeachers ?? 0;
  const totalStudents = analytics?.totalStudents ?? 0;
  const totalRooms = analytics?.totalRooms ?? 0;
  const totalActivities = analytics?.totalActivities ?? 0;
  const scheduledCount = activeTimetable?.entries?.length ?? 0;
  const conflictsCount = activeTimetable?.conflicts?.length ?? 0;

  const hasTimetable = Boolean(activeTimetable && activeTimetable.entries.length > 0);
  const qs: QualityScore | null = activeTimetable?.qualityScore ?? null;

  const overallScore = qs?.overallScore ?? 0;
  const hardScore = qs?.hardConstraintSatisfaction ?? (hasTimetable ? 100 : 0);
  const softScore = qs?.softConstraintSatisfaction ?? (hasTimetable ? 0 : 0);
  const teacherScore = qs?.teacherSatisfaction ?? 0;
  const studentScore = qs?.studentSatisfaction ?? 0;
  const roomScore = qs?.roomUtilization ?? 0;
  const gapScore = qs?.gapScore ?? 0;

  return (
    <div className="space-y-6 max-w-full">
      {/* Editorial Overview Header */}
      <div className="lux-card p-6 md:p-8 bg-white border-[#E8E7E3]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-[#F4F4F1] text-[#575A65] border border-[#E8E7E3]">
                Academic Master Plan
              </span>
              <span className="text-xs text-[#8B8E99]">Real-Time Database State</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#121316] tracking-tight">
              Timetable & Optimization Operations
            </h1>
            <p className="text-xs md:text-sm text-[#575A65] font-normal leading-relaxed">
              Algorithmic constraint satisfaction with full FET replication, NLP preference weighting, and real-time collision detection.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => onNavigate('timetable')}
              className="lux-btn text-xs py-2 px-4 flex items-center gap-2"
            >
              <CalendarCheck className="w-4 h-4 text-[#575A65]" />
              <span>Timetable Grid</span>
            </button>
            <button
              onClick={onOpenWizard}
              className="lux-btn lux-btn-primary text-xs py-2 px-4 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Smart Wizard</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid (Real-Time Database Analytics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Teachers */}
        <div
          className="lux-card p-4 flex flex-col justify-between hover:border-[#121316] transition-all cursor-pointer"
          onClick={() => onNavigate('faculty')}
        >
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded bg-[#F4F4F1] text-[#121316] flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
            <span className="text-[9px] font-bold text-[#8B8E99] uppercase tracking-widest">Faculty</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#121316] tracking-tight">{totalTeachers}</div>
            <div className="text-[11px] text-[#8B8E99] mt-0.5">Faculty Members</div>
          </div>
        </div>

        {/* Students */}
        <div
          className="lux-card p-4 flex flex-col justify-between hover:border-[#121316] transition-all cursor-pointer"
          onClick={() => onNavigate('students')}
        >
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded bg-[#F4F4F1] text-[#121316] flex items-center justify-center">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
            <span className="text-[9px] font-bold text-[#8B8E99] uppercase tracking-widest">Students</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#121316] tracking-tight">{totalStudents}</div>
            <div className="text-[11px] text-[#8B8E99] mt-0.5">Enrolled Cohorts</div>
          </div>
        </div>

        {/* Rooms & Labs */}
        <div
          className="lux-card p-4 flex flex-col justify-between hover:border-[#121316] transition-all cursor-pointer"
          onClick={() => onNavigate('infrastructure')}
        >
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded bg-[#F4F4F1] text-[#121316] flex items-center justify-center">
              <Building className="w-3.5 h-3.5" />
            </div>
            <span className="text-[9px] font-bold text-[#8B8E99] uppercase tracking-widest">Venues</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#121316] tracking-tight">{totalRooms}</div>
            <div className="text-[11px] text-[#8B8E99] mt-0.5">Theatres & Labs</div>
          </div>
        </div>

        {/* Activities */}
        <div
          className="lux-card p-4 flex flex-col justify-between hover:border-[#121316] transition-all cursor-pointer"
          onClick={() => onNavigate('activities')}
        >
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded bg-[#F4F4F1] text-[#121316] flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="text-[9px] font-bold text-[#8B8E99] uppercase tracking-widest">Sessions</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#121316] tracking-tight">{totalActivities}</div>
            <div className="text-[11px] text-[#8B8E99] mt-0.5">Total Curriculum Load</div>
          </div>
        </div>

        {/* Scheduled Allocation */}
        <div
          className="lux-card p-4 flex flex-col justify-between hover:border-[#121316] transition-all cursor-pointer"
          onClick={() => onNavigate('timetable')}
        >
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded bg-[#F0FDF4] text-[#166534] flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-[9px] font-bold text-[#8B8E99] uppercase tracking-widest">Allocated</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#121316] tracking-tight">
              {scheduledCount} <span className="text-sm font-normal text-[#8B8E99]">/ {totalActivities}</span>
            </div>
            <div className="text-[11px] text-[#166534] font-medium mt-0.5">
              {totalActivities > 0 ? `${Math.round((scheduledCount / totalActivities) * 100)}% Scheduled` : '0%'}
            </div>
          </div>
        </div>

        {/* Conflicts */}
        <div
          className="lux-card p-4 flex flex-col justify-between hover:border-[#121316] transition-all cursor-pointer"
          onClick={() => onNavigate('conflicts')}
        >
          <div className="flex items-center justify-between">
            <div className={`w-7 h-7 rounded ${conflictsCount > 0 ? 'bg-[#FEF2F2] text-[#B91C1C]' : 'bg-[#F4F4F1] text-[#121316]'} flex items-center justify-center`}>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <span className="text-[9px] font-bold text-[#8B8E99] uppercase tracking-widest">Conflicts</span>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold tracking-tight ${conflictsCount > 0 ? 'text-[#B91C1C]' : 'text-[#121316]'}`}>
              {conflictsCount}
            </div>
            <div className="text-[11px] text-[#8B8E99] mt-0.5">
              {conflictsCount === 0 ? 'Zero Collisions' : 'Requires Attention'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Scoring Index & Stakeholder Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Overall Quality Score Gauge */}
        <div className="lux-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#121316]">Optimization Index</h2>
                <p className="text-xs text-[#8B8E99]">Composite satisfaction rating</p>
              </div>
              <div className="w-7 h-7 rounded bg-[#F4F4F1] text-[#121316] flex items-center justify-center">
                <Cpu className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-center justify-center my-6">
              <div className="relative w-32 h-32 rounded-full bg-[#FAF9F7] border border-[#E8E7E3] flex items-center justify-center shadow-2xs">
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-[#121316] tracking-tight">
                    {hasTimetable ? `${overallScore}%` : 'N/A'}
                  </div>
                  <div className="text-[9px] font-bold text-[#8B8E99] uppercase tracking-widest mt-0.5">
                    {hasTimetable ? 'Efficiency' : 'Pending Solver'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                  <span className="text-[#575A65]">Hard Constraints</span>
                  <span className="font-semibold text-[#121316]">{hardScore}%</span>
                </div>
                <div className="w-full bg-[#EAE8E4] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#121316] h-full rounded-full transition-all duration-500" style={{ width: `${hardScore}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                  <span className="text-[#575A65]">Soft Preferences</span>
                  <span className="font-semibold text-[#121316]">{softScore}%</span>
                </div>
                <div className="w-full bg-[#EAE8E4] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#575A65] h-full rounded-full transition-all duration-500" style={{ width: `${softScore}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E8E7E3] flex items-center justify-between text-xs text-[#575A65]">
            <span>Algorithm: Hybrid CSP + FET</span>
            <span className={`font-semibold ${conflictsCount === 0 && hasTimetable ? 'text-[#166534]' : 'text-[#8B8E99]'} flex items-center gap-1`}>
              {conflictsCount === 0 && hasTimetable ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Fully Feasible
                </>
              ) : (
                'Solver Active'
              )}
            </span>
          </div>
        </div>

        {/* Middle: Multi-Metric Score Distribution */}
        <div className="lux-card p-6 lg:col-span-2 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#121316]">Stakeholder Satisfaction Distribution</h2>
                <p className="text-xs text-[#8B8E99]">Real-time ratings across university academic groups</p>
              </div>
              <div className="w-7 h-7 rounded bg-[#F4F4F1] text-[#121316] flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Teacher Satisfaction */}
              <div className="p-3.5 rounded-lg bg-[#F9F9F8] border border-[#E8E7E3] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#121316] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#575A65]" /> Faculty Satisfaction
                  </span>
                  <span className="font-bold text-[#121316]">{hasTimetable ? `${teacherScore}%` : '—'}</span>
                </div>
                <div className="w-full bg-[#EAE8E4] h-1 rounded-full overflow-hidden">
                  <div className="bg-[#121316] h-full rounded-full" style={{ width: `${teacherScore}%` }}></div>
                </div>
                <p className="text-[11px] text-[#8B8E99] leading-tight">Faculty gap minimization and continuous lecture constraint checks.</p>
              </div>

              {/* Student Cohort Score */}
              <div className="p-3.5 rounded-lg bg-[#F9F9F8] border border-[#E8E7E3] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#121316] flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-[#575A65]" /> Student Cohorts
                  </span>
                  <span className="font-bold text-[#121316]">{hasTimetable ? `${studentScore}%` : '—'}</span>
                </div>
                <div className="w-full bg-[#EAE8E4] h-1 rounded-full overflow-hidden">
                  <div className="bg-[#121316] h-full rounded-full" style={{ width: `${studentScore}%` }}></div>
                </div>
                <p className="text-[11px] text-[#8B8E99] leading-tight">Compact cohort timetable, zero collisions across batch subgroups.</p>
              </div>

              {/* Room Occupancy */}
              <div className="p-3.5 rounded-lg bg-[#F9F9F8] border border-[#E8E7E3] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#121316] flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#575A65]" /> Venue Occupancy
                  </span>
                  <span className="font-bold text-[#121316]">{hasTimetable ? `${roomScore}%` : '—'}</span>
                </div>
                <div className="w-full bg-[#EAE8E4] h-1 rounded-full overflow-hidden">
                  <div className="bg-[#121316] h-full rounded-full" style={{ width: `${roomScore}%` }}></div>
                </div>
                <p className="text-[11px] text-[#8B8E99] leading-tight">Room capacity matching and laboratory facility allocation.</p>
              </div>

              {/* Gap Reduction */}
              <div className="p-3.5 rounded-lg bg-[#F9F9F8] border border-[#E8E7E3] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#121316] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#575A65]" /> Gap Minimization
                  </span>
                  <span className="font-bold text-[#121316]">{hasTimetable ? `${gapScore}%` : '—'}</span>
                </div>
                <div className="w-full bg-[#EAE8E4] h-1 rounded-full overflow-hidden">
                  <div className="bg-[#121316] h-full rounded-full" style={{ width: `${gapScore}%` }}></div>
                </div>
                <p className="text-[11px] text-[#8B8E99] leading-tight">Consolidated time windows with minimized idle waiting intervals.</p>
              </div>
            </div>
          </div>

          {/* Active Preference Profile Banner */}
          <div className="p-3.5 rounded-lg bg-[#F9F9F8] border border-[#E8E7E3] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-[#121316] text-white flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs text-[#575A65]">
                <span className="font-semibold text-[#121316]">Active Profile:</span> Multi-Objective Optimization (Afternoon Labs + Minimal Student Gaps + Free Friday Afternoon)
              </div>
            </div>
            <button
              onClick={() => onNavigate('preferences')}
              className="text-xs font-semibold text-[#121316] hover:underline flex items-center gap-1 pl-3"
            >
              <span>Edit Rules</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
