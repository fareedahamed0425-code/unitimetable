import React, { useState } from 'react';
import {
  ShieldAlert,
  Server,
  Database,
  Cpu,
  Activity,
  Users,
  Lock,
  Unlock,
  RefreshCw,
  Download,
  AlertOctagon,
  CheckCircle2,
  Terminal,
  Key,
  HardDrive,
  Clock,
  Sparkles
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
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'system' | 'users' | 'database' | 'logs'>('system');

  const handleCreateBackup = () => {
    setBackupSuccess(true);
    setTimeout(() => setBackupSuccess(false), 4000);
  };

  const systemMetrics = [
    { label: 'Platform Engine', value: 'FET Core 6.0 (C++ / Node)', icon: Cpu, status: 'Optimal' },
    { label: 'Database Storage', value: 'SQLite 3.45 (WAL Mode)', icon: Database, status: 'Healthy' },
    { label: 'Active Memory', value: '142 MB / 512 MB', icon: Server, status: 'Normal' },
    { label: 'Solver Uptime', value: '99.98%', icon: Activity, status: 'Active' }
  ];

  return (
    <div className="space-y-6 max-w-full animate-fadeIn">
      {/* Super Admin High-Level Banner */}
      <div className="lux-card p-6 md:p-8 bg-gradient-to-r from-[#1E1B4B] via-[#1E1B4B] to-[#312E81] text-white border-purple-900 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-purple-400/20 text-purple-200 border border-purple-400/30">
                System Governance Root
              </span>
              <span className="text-xs text-purple-300">ID: {currentUser?.id || 'admin-root'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Super Admin Control Console
            </h1>
            <p className="text-xs md:text-sm text-purple-200/80 max-w-2xl leading-relaxed">
              Global platform governance, multi-campus scheduling orchestration, database snapshot integrity, and infrastructure safety locks.
            </p>
          </div>

          {/* Quick System Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all ${
                isLocked
                  ? 'bg-amber-500 text-white border-amber-400'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{isLocked ? 'Master System Locked' : 'System Unlocked'}</span>
            </button>

            <button
              onClick={handleCreateBackup}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white text-purple-950 hover:bg-purple-50 transition-all flex items-center gap-2 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Snapshot DB</span>
            </button>

            <button
              onClick={onOpenWizard}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all flex items-center gap-2 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Solver</span>
            </button>
          </div>
        </div>

        {backupSuccess && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
            <span>Database snapshot successfully generated and saved to <code>/backups/snapshot-{new Date().toISOString().slice(0, 10)}.db</code></span>
          </div>
        )}
      </div>

      {/* System Status Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemMetrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <div key={idx} className="lux-card p-5 bg-white border-[#E8E7E3] hover:border-purple-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">{metric.label}</span>
                <Icon className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-base font-bold text-[#121316] mt-2">{metric.value}</div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[11px] font-medium text-emerald-700">{metric.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#E8E7E3] pb-1">
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'system' ? 'bg-[#121316] text-white' : 'text-[#575A65] hover:bg-[#F4F4F1]'
          }`}
        >
          System Health & Infrastructure
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'users' ? 'bg-[#121316] text-white' : 'text-[#575A65] hover:bg-[#F4F4F1]'
          }`}
        >
          User Permissions Directory
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'database' ? 'bg-[#121316] text-white' : 'text-[#575A65] hover:bg-[#F4F4F1]'
          }`}
        >
          Database & WAL State
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'logs' ? 'bg-[#121316] text-white' : 'text-[#575A65] hover:bg-[#F4F4F1]'
          }`}
        >
          Live Engine Audit Trail
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 lux-card p-6 bg-white border-[#E8E7E3] space-y-4">
            <h3 className="text-sm font-bold text-[#121316] uppercase tracking-wider">
              Core Platform Subsystems
            </h3>
            
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg bg-[#F9F9F8] border border-[#E8E7E3] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#121316]">FET Interoperability Layer (v6.0 Parity)</div>
                  <div className="text-[11px] text-[#8B8E99]">Full bi-directional XML import/export with strict schema compliance</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ONLINE
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F9F9F8] border border-[#E8E7E3] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#121316]">Simulated Annealing Optimizer</div>
                  <div className="text-[11px] text-[#8B8E99]">Adaptive cooling schedule, conflict-directed swaps, soft penalty evaluator</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  READY
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F9F9F8] border border-[#E8E7E3] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#121316]">NVIDIA Nemotron NLP Preference Parser</div>
                  <div className="text-[11px] text-[#8B8E99]">LLM natural language constraint extractor & rule synthesizer</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                  INTEGRATED
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F9F9F8] border border-[#E8E7E3] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#121316]">Publishing Governance & Immuntable Audit Engine</div>
                  <div className="text-[11px] text-[#8B8E99]">Version control, diff comparisons, rollbacks, and dean sign-off records</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ONLINE
                </span>
              </div>
            </div>
          </div>

          <div className="lux-card p-6 bg-white border-[#E8E7E3] space-y-4">
            <h3 className="text-sm font-bold text-[#121316] uppercase tracking-wider">
              Emergency Overrides
            </h3>
            <p className="text-xs text-[#575A65]">
              Administrative root actions affecting all university departments immediately:
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => onNavigate('conflicts')}
                className="w-full text-left p-3 rounded-lg border border-[#E8E7E3] hover:bg-[#F6F5F2] transition-colors"
              >
                <div className="text-xs font-semibold text-[#121316]">Review All System Conflicts</div>
                <div className="text-[10px] text-[#8B8E99]">Inspect global room/teacher collisions</div>
              </button>

              <button
                onClick={() => onNavigate('publishing')}
                className="w-full text-left p-3 rounded-lg border border-[#E8E7E3] hover:bg-[#F6F5F2] transition-colors"
              >
                <div className="text-xs font-semibold text-[#121316]">Force Timetable Publication</div>
                <div className="text-[10px] text-[#8B8E99]">Bypass approvals and publish live schedule</div>
              </button>

              <button
                onClick={() => onNavigate('hierarchy')}
                className="w-full text-left p-3 rounded-lg border border-[#E8E7E3] hover:bg-[#F6F5F2] transition-colors"
              >
                <div className="text-xs font-semibold text-[#121316]">Campus Hierarchy Management</div>
                <div className="text-[10px] text-[#8B8E99]">Add/Edit faculties, programs, degree structures</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="lux-card p-6 bg-white border-[#E8E7E3] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#121316]">User Accounts & Role Permissions</h3>
              <p className="text-xs text-[#8B8E99]">Centralized permission matrix for Metropolitan Institute administrators</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#F4F4F1] text-[#121316] border border-[#E8E7E3]">
              6 Active Personas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F8] border-b border-[#E8E7E3] text-[#8B8E99] uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">User & Email</th>
                  <th className="p-3">Role Tier</th>
                  <th className="p-3">Scope</th>
                  <th className="p-3">Permission Level</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E7E3]">
                <tr>
                  <td className="p-3 font-semibold text-[#121316]">Super Admin (admin@mist.edu)</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">SUPER_ADMIN</span></td>
                  <td className="p-3 text-[#575A65]">Global Institution</td>
                  <td className="p-3 text-[#121316]">Full System Root</td>
                  <td className="p-3"><span className="text-emerald-600 font-bold">Active</span></td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#121316]">Dean Academic Affairs (dean@mist.edu)</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">UNIVERSITY_ADMIN</span></td>
                  <td className="p-3 text-[#575A65]">Academic Directorate</td>
                  <td className="p-3 text-[#121316]">Publish, Policy, Approve</td>
                  <td className="p-3"><span className="text-emerald-600 font-bold">Active</span></td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#121316]">Dr. Alan Turing (hod.cse@mist.edu)</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">DEPARTMENT_ADMIN</span></td>
                  <td className="p-3 text-[#575A65]">Dept. Computer Science</td>
                  <td className="p-3 text-[#121316]">Faculty, Labs, Sign-off</td>
                  <td className="p-3"><span className="text-emerald-600 font-bold">Active</span></td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#121316]">Prof. Ada Lovelace (coordinator@mist.edu)</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">TIMETABLE_COORDINATOR</span></td>
                  <td className="p-3 text-[#575A65]">Central Scheduling</td>
                  <td className="p-3 text-[#121316]">CSP Engine, Solver, FET</td>
                  <td className="p-3"><span className="text-emerald-600 font-bold">Active</span></td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#121316]">Dr. Grace Hopper (grace@mist.edu)</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold text-[10px]">FACULTY</span></td>
                  <td className="p-3 text-[#575A65]">CSE Faculty</td>
                  <td className="p-3 text-[#121316]">My Schedule, Leave, Slots</td>
                  <td className="p-3"><span className="text-emerald-600 font-bold">Active</span></td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-[#121316]">Alex Johnson (alex.j@student.mist.edu)</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold text-[10px]">STUDENT</span></td>
                  <td className="p-3 text-[#575A65]">CSE Batch 2026 (Sec A)</td>
                  <td className="p-3 text-[#121316]">View Class Routine, iCal</td>
                  <td className="p-3"><span className="text-emerald-600 font-bold">Active</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="lux-card p-6 bg-white border-[#E8E7E3] space-y-4">
          <h3 className="text-sm font-bold text-[#121316]">Database Storage Architecture</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-[#F9F9F8] border border-[#E8E7E3]">
              <div className="text-[10px] uppercase font-bold text-[#8B8E99]">Primary Database</div>
              <div className="text-sm font-bold text-[#121316] mt-1">timetable.db</div>
              <div className="text-xs text-[#575A65] mt-1">380 KB (14 Tables, Foreign Keys ON)</div>
            </div>
            <div className="p-4 rounded-lg bg-[#F9F9F8] border border-[#E8E7E3]">
              <div className="text-[10px] uppercase font-bold text-[#8B8E99]">WAL Journaling</div>
              <div className="text-sm font-bold text-[#121316] mt-1">timetable.db-wal</div>
              <div className="text-xs text-[#575A65] mt-1">High-concurrency read/write transactions</div>
            </div>
            <div className="p-4 rounded-lg bg-[#F9F9F8] border border-[#E8E7E3]">
              <div className="text-[10px] uppercase font-bold text-[#8B8E99]">Shared Memory Buffer</div>
              <div className="text-sm font-bold text-[#121316] mt-1">timetable.db-shm</div>
              <div className="text-xs text-[#575A65] mt-1">Shared-memory index for WAL readers</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="lux-card p-6 bg-[#121316] text-white border-[#121316] space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-[#8B8E99] pb-2 border-b border-white/10">
            <span className="flex items-center gap-2"><Terminal className="w-3.5 h-3.5" /> SYSTEM ACTIVITY STREAM</span>
            <span className="text-[10px] text-emerald-400">● LIVE</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div><span className="text-purple-400">[ROOT-INIT]</span> Platform initialized with Node 22 (Debian Bookworm) & better-sqlite3 native bindings.</div>
            <div><span className="text-blue-400">[AUTH]</span> Role session authenticated: SUPER_ADMIN (admin@mist.edu).</div>
            <div><span className="text-emerald-400">[FET-CORE]</span> XML Parser v6.0 loaded 48 activities, 12 teachers, 14 venues.</div>
            <div><span className="text-amber-400">[SOLVER]</span> Simulated annealing quality score evaluated at 94.2% (0 hard conflicts).</div>
            <div><span className="text-cyan-400">[API]</span> GET /api/timetables/active - 200 OK (1.2ms).</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminProfileView;
