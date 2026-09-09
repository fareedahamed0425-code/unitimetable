import React, { useState } from 'react';
import {
  Briefcase,
  Users,
  Layers,
  Building,
  CheckSquare,
  BookOpen,
  Calendar,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';
import { User, Timetable, Teacher } from '../../../../shared/types';

interface DepartmentAdminProfileViewProps {
  currentUser: User | null;
  activeTimetable: Timetable | null;
  teachers: Teacher[];
  onNavigate: (section: string) => void;
  onOpenWizard: () => void;
}

export const DepartmentAdminProfileView: React.FC<DepartmentAdminProfileViewProps> = ({
  currentUser,
  activeTimetable,
  teachers,
  onNavigate,
  onOpenWizard
}) => {
  const [activeTab, setActiveTab] = useState<'workload' | 'labs' | 'curriculum'>('workload');

  const cseTeachers = teachers.length > 0 ? teachers : [
    { id: 't1', name: 'Dr. Alan Turing', employeeId: 'EMP-001', designation: 'Professor & HOD', maxHoursPerWeek: 14, maxHoursPerDay: 4, minHoursPerDay: 2, maxWorkingDaysPerWeek: 5, minWorkingDaysPerWeek: 4, maxConsecutiveHours: 3, maxGapsPerDay: 1, maxGapsPerWeek: 3, qualifications: ['CS301', 'CS401'], email: 'alan@mist.edu', departmentId: 'dept-cse' },
    { id: 't2', name: 'Dr. Grace Hopper', employeeId: 'EMP-002', designation: 'Professor', maxHoursPerWeek: 16, maxHoursPerDay: 4, minHoursPerDay: 2, maxWorkingDaysPerWeek: 5, minWorkingDaysPerWeek: 4, maxConsecutiveHours: 3, maxGapsPerDay: 1, maxGapsPerWeek: 3, qualifications: ['CS302', 'CS305'], email: 'grace@mist.edu', departmentId: 'dept-cse' },
    { id: 't3', name: 'Dr. Donald Knuth', employeeId: 'EMP-003', designation: 'Associate Professor', maxHoursPerWeek: 16, maxHoursPerDay: 4, minHoursPerDay: 2, maxWorkingDaysPerWeek: 5, minWorkingDaysPerWeek: 4, maxConsecutiveHours: 3, maxGapsPerDay: 1, maxGapsPerWeek: 3, qualifications: ['CS303', 'CS402'], email: 'donald@mist.edu', departmentId: 'dept-cse' },
    { id: 't4', name: 'Dr. Barbara Liskov', employeeId: 'EMP-004', designation: 'Associate Professor', maxHoursPerWeek: 16, maxHoursPerDay: 4, minHoursPerDay: 2, maxWorkingDaysPerWeek: 5, minWorkingDaysPerWeek: 4, maxConsecutiveHours: 3, maxGapsPerDay: 1, maxGapsPerWeek: 3, qualifications: ['CS304', 'CS403'], email: 'barbara@mist.edu', departmentId: 'dept-cse' }
  ];

  const labs = [
    { name: 'Computer Lab 1 (Algorithms & Systems)', capacity: 40, building: 'CS Block, 2nd Floor', bookedHours: 28, maxHours: 35, status: '80% Occupied' },
    { name: 'Computer Lab 2 (AI & Cloud Center)', capacity: 40, building: 'CS Block, 3rd Floor', bookedHours: 30, maxHours: 35, status: '85% Occupied' },
    { name: 'Microprocessor & IoT Lab', capacity: 30, building: 'Hardware Wing, 1st Floor', bookedHours: 20, maxHours: 35, status: '57% Occupied' }
  ];

  return (
    <div className="space-y-6 max-w-full animate-fadeIn">
      {/* HOD Banner */}
      <div className="lux-card p-6 md:p-8 bg-gradient-to-r from-[#064E3B] via-[#065F46] to-[#047857] text-white border-emerald-700 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-emerald-300/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                Department Cockpit
              </span>
              <span className="text-xs text-emerald-200">Dept. Computer Science & Engineering</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              HOD Management Console
            </h1>
            <p className="text-xs md:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
              Curriculum delivery tracking, faculty teaching workload allocation, lab batch splits, and departmental schedule verification for CSE.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('timetable')}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-white text-emerald-950 hover:bg-emerald-50 transition-all flex items-center gap-2 shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>CSE Timetable Grid</span>
            </button>

            <button
              onClick={onOpenWizard}
              className="px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-600 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Re-Optimize Dept</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">CSE Faculty Members</div>
          <div className="text-2xl font-bold text-[#121316] mt-2">{cseTeachers.length} Professors</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">100% Workload Balanced</div>
        </div>

        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">CSE Lab Utilization</div>
          <div className="text-2xl font-bold text-[#121316] mt-2">78%</div>
          <div className="text-[11px] text-[#8B8E99] mt-1">3 Specialized Computer Labs</div>
        </div>

        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">Active Course Modules</div>
          <div className="text-2xl font-bold text-[#121316] mt-2">8 Subjects</div>
          <div className="text-[11px] text-[#8B8E99] mt-1">6 Theory • 2 Practical Labs</div>
        </div>

        <div className="lux-card p-5 bg-white border-[#E8E7E3]">
          <div className="text-[11px] font-bold text-[#8B8E99] uppercase tracking-wider">Student Cohorts</div>
          <div className="text-2xl font-bold text-[#121316] mt-2">240 Students</div>
          <div className="text-[11px] text-[#8B8E99] mt-1">Sec A, Sec B (4 Lab Groups)</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8E7E3] pb-1">
        <button
          onClick={() => setActiveTab('workload')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'workload' ? 'bg-[#121316] text-white' : 'text-[#575A65] hover:bg-[#F4F4F1]'
          }`}
        >
          CSE Faculty Teaching Allocations
        </button>
        <button
          onClick={() => setActiveTab('labs')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'labs' ? 'bg-[#121316] text-white' : 'text-[#575A65] hover:bg-[#F4F4F1]'
          }`}
        >
          Laboratory Hardware & Slot Utilization
        </button>
        <button
          onClick={() => setActiveTab('curriculum')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'curriculum' ? 'bg-[#121316] text-white' : 'text-[#575A65] hover:bg-[#F4F4F1]'
          }`}
        >
          Curriculum & Cohort Split Matrix
        </button>
      </div>

      {/* Tab: Workload */}
      {activeTab === 'workload' && (
        <div className="lux-card p-6 bg-white border-[#E8E7E3] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#121316]">CSE Faculty Workload & Course Allocations</h3>
              <p className="text-xs text-[#8B8E99]">Assigned hours vs statutory limits to prevent faculty overload</p>
            </div>
            <button
              onClick={() => onNavigate('faculty')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
            >
              <span>Manage Teachers Directory</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F8] border-b border-[#E8E7E3] text-[#8B8E99] uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Faculty Name</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Allocated Courses</th>
                  <th className="p-3">Weekly Assigned Load</th>
                  <th className="p-3">Max Cap</th>
                  <th className="p-3">Load Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E7E3]">
                {cseTeachers.map((teacher, idx) => (
                  <tr key={idx} className="hover:bg-[#FAF9F7] transition-colors">
                    <td className="p-3 font-semibold text-[#121316]">{teacher.name}</td>
                    <td className="p-3 text-[#575A65]">{teacher.designation}</td>
                    <td className="p-3 text-[#121316]">
                      <div className="flex flex-wrap gap-1">
                        {teacher.qualifications.map((q, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-[#F4F4F1] border border-[#E8E7E3] text-[10px] font-bold text-[#121316]">
                            {q}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 font-bold text-[#121316]">14 hrs / week</td>
                    <td className="p-3 text-[#8B8E99]">{teacher.maxHoursPerWeek} hrs max</td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Balanced (87.5%)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Labs */}
      {activeTab === 'labs' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {labs.map((lab, idx) => (
            <div key={idx} className="lux-card p-5 bg-white border-[#E8E7E3] space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-bold text-[#121316]">{lab.name}</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                  {lab.status}
                </span>
              </div>
              <p className="text-[11px] text-[#8B8E99]">{lab.building}</p>
              <div className="pt-2 border-t border-[#E8E7E3] flex items-center justify-between text-xs">
                <span className="text-[#8B8E99]">Capacity: <strong>{lab.capacity} seats</strong></span>
                <span className="text-[#121316] font-semibold">{lab.bookedHours} / {lab.maxHours} hrs</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Curriculum */}
      {activeTab === 'curriculum' && (
        <div className="lux-card p-6 bg-white border-[#E8E7E3] space-y-3">
          <h3 className="text-sm font-bold text-[#121316]">CSE Semester 3 & 5 Curriculum Structure</h3>
          <p className="text-xs text-[#575A65]">
            Core lectures are scheduled in Lecture Hall 101/102. Laboratory practicals are automatically split into Group A1 and Group A2 to prevent lab overcrowding.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('courses')}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#121316] text-white hover:bg-black transition-all"
            >
              Open Full Course & Activity Registry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentAdminProfileView;
