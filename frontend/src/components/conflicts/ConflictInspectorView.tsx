import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { TimetableConflict } from '../../../../shared/types';

interface ConflictInspectorProps {
  conflicts: TimetableConflict[];
  onNavigateToGrid: () => void;
}

export const ConflictInspectorView: React.FC<ConflictInspectorProps> = ({
  conflicts,
  onNavigateToGrid
}) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'MAJOR' | 'WARNING'>('ALL');

  const filtered = conflicts.filter(c => {
    if (severityFilter === 'ALL') return true;
    return c.severity === severityFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="lux-card p-6 bg-white border-[#E8E7E3]">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]">
                Collision Engine
              </span>
              <span className="text-xs text-[#8B8E99] font-medium">Real-Time Validation</span>
            </div>
            <h1 className="text-2xl font-bold text-[#121316] tracking-tight">Conflict & Diagnostic Center</h1>
            <p className="text-xs text-[#575A65]">
              Live collision detection inspecting faculty double-bookings, student group overlaps, and venue capacity violations.
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FEF2F2] text-[#B91C1C] flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Conflicts Count & Filter Bar */}
      <div className="lux-card p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-xs font-semibold text-[#121316]">
            Detected Collisions: <span className={`font-bold ${conflicts.length === 0 ? 'text-[#166534]' : 'text-[#B91C1C]'}`}>{conflicts.length}</span>
          </div>

          <div className="flex items-center gap-2 pl-4 border-l border-[#E8E7E3]">
            <Filter className="w-3.5 h-3.5 text-[#8B8E99]" />
            <div className="relative">
              <select
                className="lux-select text-xs py-1 pl-3 pr-8 font-medium appearance-none cursor-pointer"
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value as any)}
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical Collisions (Hard)</option>
                <option value="MAJOR">Major Incompatibilities</option>
                <option value="WARNING">Warnings</option>
              </select>
              <ChevronDown className="w-3 h-3 text-[#8B8E99] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        <button
          onClick={onNavigateToGrid}
          className="lux-btn text-xs py-1.5 px-4 flex items-center gap-1.5"
        >
          <span>Open Timetable Grid</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#8B8E99]" />
        </button>
      </div>

      {/* Conflict Cards or Clean Zero State */}
      {filtered.length === 0 ? (
        <div className="lux-card p-12 text-center space-y-3 max-w-md mx-auto my-8">
          <div className="w-10 h-10 rounded-full bg-[#F0FDF4] text-[#166534] mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#121316]">Zero Schedule Conflicts</h3>
          <p className="text-xs text-[#8B8E99] leading-relaxed">
            All hard constraints and availability windows are fully satisfied. The schedule is ready for university publishing.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const isCritical = c.severity === 'CRITICAL';
            return (
              <div
                key={c.id}
                className={`lux-card p-5 border-l-4 ${
                  isCritical ? 'border-l-[#B91C1C]' : 'border-l-[#718096]'
                } space-y-3`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${isCritical ? 'badge-danger' : 'badge-warning'} text-[9px]`}>
                        {c.severity} — {c.conflictType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-bold text-[#121316]">{c.title}</span>
                    </div>
                    <p className="text-xs text-[#575A65] leading-relaxed">{c.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-2 border-t border-[#E8E7E3]">
                  <div className="p-2.5 rounded-lg bg-[#FAF9F7] border border-[#E8E7E3]">
                    <span className="text-[9px] text-[#8B8E99] font-bold uppercase tracking-wider block">Violated Rule</span>
                    <span className="text-[#121316] font-medium mt-0.5 block">{c.violatedConstraintRule}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#FAF9F7] border border-[#E8E7E3] sm:col-span-2">
                    <span className="text-[9px] text-[#166534] font-bold uppercase tracking-wider block">Suggested Fix</span>
                    <span className="text-[#121316] font-medium mt-0.5 block">{c.suggestedFix || 'Move conflicting activity to an alternative period.'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ConflictInspectorView;
