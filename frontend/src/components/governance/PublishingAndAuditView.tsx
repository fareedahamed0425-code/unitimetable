import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  History,
  CheckCircle2,
  Archive
} from 'lucide-react';
import { api } from '../../api';
import { AuditLog, Timetable, TimetableStatus } from '../../../../shared/types';

interface PublishingProps {
  activeTimetable: Timetable | null;
  onRefresh: () => void;
}

export const PublishingAndAuditView: React.FC<PublishingProps> = ({
  activeTimetable,
  onRefresh
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const logs = await api.getAuditLogs();
      setAuditLogs(logs || []);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    }
  };

  const handleSetStatus = async (status: TimetableStatus) => {
    await api.setTimetableStatus(status);
    await loadLogs();
    onRefresh();
  };

  const lifecycleStages: { status: TimetableStatus; label: string; desc: string }[] = [
    { status: 'DRAFT', label: 'Draft', desc: 'Initial working document' },
    { status: 'GENERATED', label: 'Generated', desc: 'Engine output' },
    { status: 'UNDER_REVIEW', label: 'Under Review', desc: 'HOD & Dean review' },
    { status: 'APPROVED', label: 'Approved', desc: 'Senate approval' },
    { status: 'PUBLISHED', label: 'Published', desc: 'Live to all users' },
    { status: 'ARCHIVED', label: 'Archived', desc: 'Historical term record' }
  ];

  const currentStatus = activeTimetable?.status || 'DRAFT';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="lux-card p-6 bg-white border-[#E8E7E3]">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-[#F4F4F1] text-[#575A65] border border-[#E8E7E3]">
              Governance & Integrity
            </span>
            <h1 className="text-2xl font-bold text-[#121316] tracking-tight">Versioning, Publishing & Audit Trail</h1>
            <p className="text-xs text-[#575A65]">
              Control the academic publishing lifecycle, review immutable audit events, and enforce institutional integrity.
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#F4F4F1] text-[#121316] flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Lifecycle Pipeline Progress */}
      <div className="lux-card p-6 space-y-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#121316]">Academic Publishing Lifecycle</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {lifecycleStages.map((stage, idx) => {
            const isCurrent = currentStatus === stage.status;
            return (
              <div
                key={stage.status}
                onClick={() => handleSetStatus(stage.status)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  isCurrent
                    ? 'border-[#121316] bg-[#FAF9F7] shadow-xs'
                    : 'border-[#E8E7E3] bg-white hover:border-[#8B8E99]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-bold text-[#8B8E99]">0{idx + 1}</span>
                  {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-[#121316]" />}
                </div>
                <div className="text-xs font-bold text-[#121316]">{stage.label}</div>
                <div className="text-[10px] text-[#8B8E99] mt-1 leading-snug">{stage.desc}</div>
              </div>
            );
          })}
        </div>

        <div className="p-4 rounded-lg bg-[#FAF9F7] border border-[#E8E7E3] flex items-center justify-between">
          <div className="text-xs text-[#575A65]">
            Current Public State: <strong className="text-[#121316] uppercase">{currentStatus}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSetStatus('PUBLISHED')}
              className="lux-btn lux-btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Publish Live</span>
            </button>
            <button
              onClick={() => handleSetStatus('ARCHIVED')}
              className="lux-btn text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5 text-[#575A65]" />
              <span>Archive</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real Database Audit Log Stream */}
      <div className="lux-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#575A65]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#121316]">System Audit Trail</h2>
          </div>
          <span className="text-xs text-[#8B8E99]">Real-time immutable database ledger ({auditLogs.length} events)</span>
        </div>

        <div className="space-y-2">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8B8E99] border border-[#E8E7E3] rounded-lg">
              No audit logs recorded in the database yet.
            </div>
          ) : (
            auditLogs.map((log, idx) => (
              <div key={log.id || idx} className="p-3 rounded-lg border border-[#E8E7E3] bg-white flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#121316]">{log.action.replace(/_/g, ' ')}</span>
                    <span className="badge badge-slate text-[9px]">{log.entityType}</span>
                  </div>
                  <div className="text-[#575A65]">
                    ID: <code>{log.entityId}</code> • Executed by: <strong>{log.userName || log.userId || 'System'}</strong>
                  </div>
                  {(log.afterValue || log.beforeValue) && (
                    <div className="text-[11px] text-[#8B8E99] font-mono truncate max-w-xl">
                      {log.afterValue || log.beforeValue}
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-[#8B8E99] font-medium whitespace-nowrap">
                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Recent'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PublishingAndAuditView;
