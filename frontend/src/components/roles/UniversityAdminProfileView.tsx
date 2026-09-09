import React, { useState } from 'react';
import {
  Award,
  Building,
  ShieldCheck,
  BarChart3,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  FileText
} from 'lucide-react';
import { User, Timetable } from '../../../../shared/types';

interface UniversityAdminProfileViewProps {
  currentUser: User | null;
  activeTimetable: Timetable | null;
  analytics: any;
  onNavigate: (section: string) => void;
  onOpenPublishing: () => void;
}

export const UniversityAdminProfileView: React.FC<UniversityAdminProfileViewProps> = ({
  currentUser,
  activeTimetable,
  analytics,
  onNavigate,
  onOpenPublishing
}) => {
  const [approvedStatus, setApprovedStatus] = useState<string | null>(null);

  const qs = activeTimetable?.qualityScore;
  const overallScore = qs?.overallScore ?? 94;
  const hardScore = qs?.hardConstraintSatisfaction ?? 100;
  const teacherScore = qs?.teacherSatisfaction ?? 91;
  const studentScore = qs?.studentSatisfaction ?? 93;
  const roomScore = qs?.roomUtilization ?? 88;

  const departmentBenchmarks = [
    { name: 'Computer Science & Engineering', hod: 'Dr. Alan Turing', facultyCount: 12, compliance: 98, loadHours: 168, status: 'Compliant' },
    { name: 'Electronics & Communication', hod: 'Dr. Claude Shannon', facultyCount: 10, compliance: 95, loadHours: 142, status: 'Compliant' },
    { name: 'Mechanical Engineering', hod: 'Dr. Nikola Tesla', facultyCount: 8, compliance: 91, loadHours: 120, status: 'Review Needed' },
    { name: 'Civil Engineering', hod: 'Dr. Thomas Telford', facultyCount: 6, compliance: 96, loadHours: 88, status: 'Compliant' }
  ];

  const handleDeanApproval = () => {
    setApprovedStatus('APPROVED_BY_DEAN');
    setTimeout(() => {
      onOpenPublishing();
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-full animate-fadeIn">
      {/* Executive Dean Banner */}
      <div className="apollo-hero-banner p-6 md:p-8 relative">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-[#FDB931]/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="apollo-hero-badge">
                The Apollo University • Academic Directorate
              </span>
              <span className="apollo-hero-sub">Term: 2026–2027 (Odd Semester)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight apollo-hero-title">
              Dean of Academic Affairs Directorate
            </h1>
            <p className="text-xs md:text-sm apollo-hero-desc max-w-2xl leading-relaxed">
              Institutional curriculum oversight, cross-department scheduling compliance, room utilization audits, and statutory academic calendar approvals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleDeanApproval}
              className="px-4 py-2.5 rounded-lg text-xs font-bold bg-[#FDB931] hover:bg-[#EAA319] text-[#002E4E] transition-all flex items-center gap-2 shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 text-[#002E4E]" />
              <span>{approvedStatus ? 'Dean Sign-Off Completed' : 'Formal Dean Approval'}</span>
            </button>

            <button
              onClick={() => onNavigate('timetable')}
              className="px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-2"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Inspect Master Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* High-Level Institutional Health Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">Overall Timetable Quality</div>
          <div className="text-2xl font-bold text-[#121316] mt-2 flex items-baseline gap-2">
            <span>{overallScore}%</span>
            <span className="text-xs font-normal text-emerald-600 flex items-center"><TrendingUp className="w-3 h-3 mr-0.5" /> Optimal</span>
          </div>
          <div className="text-[11px] text-[#8B8E99] mt-1">{hardScore}% Hard Constraints Met</div>
        </div>

        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">Campus Room Utilization</div>
          <div className="text-2xl font-bold text-[#121316] mt-2">{roomScore}%</div>
          <div className="text-[11px] text-[#8B8E99] mt-1">14 Venues (0 Hall Collisions)</div>
        </div>

        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">Faculty Satisfaction</div>
          <div className="text-2xl font-bold text-[#121316] mt-2">{teacherScore}%</div>
          <div className="text-[11px] text-[#8B8E99] mt-1">Gaps & Max 3hr load respected</div>
        </div>

        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">Student Satisfaction</div>
          <div className="text-2xl font-bold text-[#121316] mt-2">{studentScore}%</div>
          <div className="text-[11px] text-[#8B8E99] mt-1">Continuous blocks & lunch breaks</div>
        </div>
      </div>

      {/* Department Compliance & Accreditation Radar */}
      <div className="lux-card p-6 bg-white border-[#E8E7E3] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#121316]">Departmental Scheduling Compliance</h3>
            <p className="text-xs text-[#8B8E99]">Faculty teaching loads and curriculum allocation across university schools</p>
          </div>
          <button
            onClick={() => onNavigate('hierarchy')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View All Departments</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9F9F8] border-b border-[#E8E7E3] text-[#8B8E99] uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3">Department Name</th>
                <th className="p-3">Head of Department (HOD)</th>
                <th className="p-3">Faculty Count</th>
                <th className="p-3">Weekly Hours</th>
                <th className="p-3">Policy Compliance</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E7E3]">
              {departmentBenchmarks.map((dept, idx) => (
                <tr key={idx} className="hover:bg-[#FAF9F7] transition-colors">
                  <td className="p-3 font-semibold text-[#121316]">{dept.name}</td>
                  <td className="p-3 text-[#575A65]">{dept.hod}</td>
                  <td className="p-3 text-[#121316]">{dept.facultyCount} Teachers</td>
                  <td className="p-3 text-[#121316] font-medium">{dept.loadHours} hrs / week</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-[#E8E7E3] rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${dept.compliance}%` }} />
                      </div>
                      <span className="font-bold text-[#121316]">{dept.compliance}%</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      dept.status === 'Compliant'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {dept.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Institutional Policy Directives */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="lux-card p-6 bg-white border-[#E8E7E3] space-y-3">
          <h3 className="text-sm font-bold text-[#121316]">Dean's Statutory Directives</h3>
          <ul className="space-y-2 text-xs text-[#575A65]">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span><strong>Friday Common Hour (3 PM - 5 PM):</strong> Reserved across all departments for guest lectures & seminars.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span><strong>Max Consecutive Teaching:</strong> Professors capped at 3 continuous periods without break.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span><strong>Mandatory Recess:</strong> Lunch slot (1:00 PM - 2:00 PM) hard-locked for all cohorts.</span>
            </li>
          </ul>
        </div>

        <div className="lux-card p-6 bg-white border-[#E8E7E3] space-y-3">
          <h3 className="text-sm font-bold text-[#121316]">Statutory Publication Workflow</h3>
          <p className="text-xs text-[#575A65]">
            Formal publishing pushes the schedule to faculty and student mobile portals and generates verified PDF rosters for campus noticeboards.
          </p>
          <div className="pt-2">
            <button
              onClick={onOpenPublishing}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#121316] hover:bg-black text-white transition-all flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Open Version & Publishing Manager</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UniversityAdminProfileView;
