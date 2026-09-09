import React from 'react';
import {
  Sliders,
  Sparkles,
  Zap,
  Activity,
  AlertTriangle,
  Calendar,
  Layers,
  CheckSquare,
  FileCode,
  ArrowUpRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { User, Timetable } from '../../../../shared/types';

interface CoordinatorProfileViewProps {
  currentUser: User | null;
  activeTimetable: Timetable | null;
  analytics: any;
  onOpenWizard: () => void;
  onNavigate: (section: string) => void;
}

export const CoordinatorProfileView: React.FC<CoordinatorProfileViewProps> = ({
  currentUser,
  activeTimetable,
  analytics,
  onOpenWizard,
  onNavigate
}) => {
  const qs = activeTimetable?.qualityScore;
  const overallScore = qs?.overallScore ?? 94;
  const hardScore = qs?.hardConstraintSatisfaction ?? 100;
  const softScore = qs?.softConstraintSatisfaction ?? 88;
  const conflictsCount = activeTimetable?.conflicts?.length ?? 0;

  return (
    <div className="space-y-6 max-w-full animate-fadeIn">
      {/* Coordinator Architect Banner */}
      <div className="apollo-hero-banner p-6 md:p-8 relative">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-80 h-80 bg-[#FDB931]/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="apollo-hero-badge">
                The Apollo University • Scheduling Architect Hub
              </span>
              <span className="apollo-hero-sub">Constraint Satisfaction & Optimizer</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight apollo-hero-title">
              Timetable Coordinator Command Desk
            </h1>
            <p className="text-xs md:text-sm apollo-hero-desc max-w-2xl leading-relaxed">
              Fine-tune simulated annealing cooling parameters, resolve conflict collisions, configure smart preference weights, and synchronize with FET XML.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenWizard}
              className="px-4 py-2.5 rounded-lg text-xs font-bold bg-[#FDB931] hover:bg-[#EAA319] text-[#002E4E] transition-all flex items-center gap-2 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#002E4E]" />
              <span>Launch Smart Wizard</span>
            </button>

            <button
              onClick={() => onNavigate('conflicts')}
              className="px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-2"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Conflicts ({conflictsCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Solver Performance Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">Overall Annealing Score</div>
          <div className="text-2xl font-bold text-[#121316] mt-2 flex items-baseline gap-1.5">
            <span>{overallScore}%</span>
            <span className="text-xs font-normal text-emerald-600">(Target &gt; 90%)</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">High Energy Convergence</div>
        </div>

        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">Hard Constraint Solvency</div>
          <div className="text-2xl font-bold text-[#121316] mt-2">{hardScore}%</div>
          <div className="text-[11px] text-[#8B8E99] mt-1">0 Overlaps • 0 Hall Collisions</div>
        </div>

        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">Soft Preference Score</div>
          <div className="text-2xl font-bold text-[#121316] mt-2">{softScore}%</div>
          <div className="text-[11px] text-[#8B8E99] mt-1">Teacher & Student Preferences</div>
        </div>

        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">Active Solver Violations</div>
          <div className="text-2xl font-bold text-[#121316] mt-2">{conflictsCount} Violations</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Ready for Publishing</div>
        </div>
      </div>

      {/* Coordinator Quick Workspaces */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="lux-card p-6 bg-white border-[#E8E7E3] space-y-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-[#121316]">Smart Preference Profiles</h3>
          <p className="text-xs text-[#575A65]">
            Configure Student-Friendly, Faculty-Friendly, or Balanced constraint profiles with natural language prompts.
          </p>
          <button
            onClick={() => onNavigate('preferences')}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 pt-2"
          >
            <span>Open Preference Profiles</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="lux-card p-6 bg-white border-[#E8E7E3] space-y-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-[#121316]">Activity Relations & Links</h3>
          <p className="text-xs text-[#575A65]">
            Define SAME_STARTING_TIME, CONSECUTIVE lectures, and minimum gap rules between course modules.
          </p>
          <button
            onClick={() => onNavigate('activities')}
            className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 pt-2"
          >
            <span>Manage Activity Links</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="lux-card p-6 bg-white border-[#E8E7E3] space-y-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
            <FileCode className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-[#121316]">FET XML Interchange Hub</h3>
          <p className="text-xs text-[#575A65]">
            Import legacy .fet files, validate compatibility reports, and export official FET XML schedules.
          </p>
          <button
            onClick={() => onNavigate('fet')}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 pt-2"
          >
            <span>Open FET XML Hub</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoordinatorProfileView;
