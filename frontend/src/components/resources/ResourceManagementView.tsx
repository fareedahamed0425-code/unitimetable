import React, { useState, useEffect } from 'react';
import {
  Network,
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  Building,
  Clock
} from 'lucide-react';
import { api } from '../../api';
import { Activity, Building as BuildingType, Course, Room, Teacher, TimeSlot } from '../../../../shared/types';

interface ResourceProps {
  initialTab?: 'hierarchy' | 'faculty' | 'students' | 'courses' | 'activities' | 'infrastructure' | 'calendar';
}

export const ResourceManagementView: React.FC<ResourceProps> = ({ initialTab = 'faculty' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [hierarchy, setHierarchy] = useState<any>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [infra, setInfra] = useState<{ buildings: BuildingType[]; rooms: Room[] }>({ buildings: [], rooms: [] });
  const [calendar, setCalendar] = useState<TimeSlot[]>([]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [h, t, c, a, inf, cal] = await Promise.all([
      api.getHierarchy(),
      api.getTeachers(),
      api.getCourses(),
      api.getActivities(),
      api.getInfrastructure(),
      api.getCalendar()
    ]);
    setHierarchy(h);
    setTeachers(t);
    setCourses(c);
    setActivities(a);
    setInfra(inf);
    setCalendar(cal);
  };

  const tabs = [
    { id: 'hierarchy', label: 'Hierarchy', icon: Network },
    { id: 'faculty', label: 'Faculty', icon: Users },
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'activities', label: 'Activities', icon: Layers },
    { id: 'infrastructure', label: 'Venues', icon: Building },
    { id: 'calendar', label: 'Periods', icon: Clock }
  ];

  return (
    <div className="space-y-6">
      {/* Header & Segmented Tab Bar */}
      <div className="lux-card p-6 bg-white border-[#E8E7E3]">
        <div className="space-y-1">
          <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-[#F4F4F1] text-[#575A65] border border-[#E8E7E3]">
            Academic Catalog
          </span>
          <h1 className="text-2xl font-bold text-[#121316] tracking-tight">University Academic Structure & Entities</h1>
          <p className="text-xs text-[#575A65]">
            Manage university hierarchy, teachers, qualification mappings, student batches, curriculum courses, rooms, and time periods.
          </p>
        </div>

        {/* Minimalist Tabs Bar */}
        <div className="flex items-center gap-1.5 mt-6 bg-[#F4F4F1] p-1 rounded-lg border border-[#E8E7E3] overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-[#121316] shadow-xs'
                    : 'text-[#575A65] hover:text-[#121316]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content 1: Hierarchy */}
      {activeTab === 'hierarchy' && hierarchy && (
        <div className="lux-card p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#121316]">University Structure Tree</h2>
          <div className="p-5 rounded-lg bg-[#FAF9F7] border border-[#E8E7E3] text-xs space-y-4">
            <div className="font-bold text-[#121316] text-sm flex items-center gap-2">
              <span>🏛️ {hierarchy.university?.name}</span>
              <span className="badge badge-primary text-[9px]">{hierarchy.university?.code}</span>
            </div>

            <div className="pl-5 border-l-2 border-[#121316]/30 space-y-3">
              {hierarchy.campuses?.map((camp: any) => (
                <div key={camp.id} className="space-y-2">
                  <div className="font-semibold text-[#121316]">📍 Campus: {camp.name} ({camp.code})</div>

                  <div className="pl-5 border-l-2 border-[#E8E7E3] space-y-2">
                    {hierarchy.faculties?.filter((f: any) => f.campus_id === camp.id).map((fac: any) => (
                      <div key={fac.id} className="space-y-1.5">
                        <div className="font-medium text-[#575A65]">🎓 Faculty: {fac.name} (Dean: {fac.dean_name})</div>

                        <div className="pl-5 border-l-2 border-[#E8E7E3] space-y-1">
                          {hierarchy.departments?.filter((d: any) => d.faculty_id === fac.id).map((dept: any) => (
                            <div key={dept.id} className="text-[#575A65]">
                              📚 Department: <strong>{dept.name}</strong> (HOD: {dept.head_of_department})
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Faculty */}
      {activeTab === 'faculty' && (
        <div className="lux-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#121316]">Faculty Members & Workload ({teachers.length})</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {teachers.map(t => (
              <div key={t.id} className="p-4 rounded-lg bg-white border border-[#E8E7E3] space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-xs text-[#121316]">{t.name}</div>
                    <div className="text-[11px] text-[#8B8E99] font-medium">{t.designation} • {t.employeeId}</div>
                  </div>
                  <span className="badge badge-success text-[9px]">Active</span>
                </div>

                <div className="text-[11px] text-[#575A65] space-y-1 pt-2 border-t border-[#F0EFEA]">
                  <div>Max Hours/Day: <strong>{t.maxHoursPerDay} hrs</strong></div>
                  <div>Max Hours/Week: <strong>{t.maxHoursPerWeek} hrs</strong></div>
                  <div>Max Consecutive: <strong>{t.maxConsecutiveHours} hrs</strong></div>
                </div>

                <div className="pt-2 border-t border-[#F0EFEA]">
                  <span className="text-[9px] uppercase font-bold text-[#8B8E99] tracking-wider block mb-1">Qualified Courses:</span>
                  <div className="flex flex-wrap gap-1">
                    {t.qualifications.map((q, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-[#F4F4F1] text-[#121316] border border-[#E8E7E3] font-medium">
                        {q.replace('course-', '').toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 3: Students */}
      {activeTab === 'students' && hierarchy && (
        <div className="lux-card p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#121316]">Student Cohorts & Batches</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {hierarchy.sections?.map((sec: any) => (
              <div key={sec.id} className="p-4 rounded-lg bg-white border border-[#E8E7E3] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-[#121316]">{sec.name}</div>
                  <span className="badge badge-primary text-[9px]">{sec.student_count} Students</span>
                </div>
                <div className="text-xs text-[#575A65]">
                  Subgroups: {hierarchy.studentGroups?.filter((g: any) => g.section_id === sec.id).map((g: any) => g.name).join(', ') || 'Standard Class'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 4: Courses */}
      {activeTab === 'courses' && (
        <div className="lux-card p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#121316]">Curriculum & Course Catalogue ({courses.length})</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {courses.map(c => (
              <div key={c.id} className="p-4 rounded-lg bg-white border border-[#E8E7E3] space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-xs text-[#121316]">{c.code} — {c.name}</span>
                    <div className="text-[11px] text-[#8B8E99] font-medium">Semester {c.semesterNumber} • {c.credits} Credits</div>
                  </div>
                  <span className={`badge ${c.courseType === 'LABORATORY' ? 'badge-primary' : 'badge-slate'} text-[9px]`}>
                    {c.courseType}
                  </span>
                </div>

                <div className="text-xs text-[#575A65] flex items-center justify-between pt-2 border-t border-[#F0EFEA]">
                  <span>Weekly Load: <strong>{c.lectureHoursPerWeek} hrs</strong></span>
                  <span>Required Venue: <strong>{c.requiredRoomType}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 5: Activities */}
      {activeTab === 'activities' && (
        <div className="lux-card p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#121316]">Scheduling Activities ({activities.length})</h2>

          <div className="space-y-2">
            {activities.map(a => (
              <div key={a.id} className="p-3.5 rounded-lg border border-[#E8E7E3] bg-white flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#121316]">{a.code}</span>
                    <span className="text-xs text-[#575A65] font-medium">{a.name}</span>
                    <span className={`badge ${a.activityType === 'LABORATORY' ? 'badge-primary' : 'badge-slate'} text-[9px]`}>
                      {a.activityType} ({a.durationPeriods} hr)
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8B8E99]">
                    Faculty: <strong>{a.teacherIds.map(t => teachers.find(teach => teach.id === t)?.name || t).join(', ')}</strong> • Target: {a.sectionIds.join(', ') || a.groupIds.join(', ')}
                  </div>
                </div>

                <div className="text-right text-xs text-[#575A65]">
                  <div>Venue: <strong>{a.requiredRoomType}</strong></div>
                  <div>Cohort Size: <strong>{a.totalStudentCount} seats</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 6: Infrastructure */}
      {activeTab === 'infrastructure' && (
        <div className="lux-card p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#121316]">Rooms, Laboratories & Buildings ({infra.rooms.length})</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {infra.rooms.map(r => (
              <div key={r.id} className="p-4 rounded-lg bg-white border border-[#E8E7E3] space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-xs text-[#121316]">{r.name}</div>
                    <div className="text-[11px] text-[#8B8E99]">{r.code} • Floor {r.floor}</div>
                  </div>
                  <span className="badge badge-primary text-[9px]">{r.capacity} Seats</span>
                </div>

                <div className="text-xs text-[#575A65] pt-2 border-t border-[#F0EFEA] flex items-center justify-between">
                  <span>Type: <strong>{r.roomType}</strong></span>
                  <span className="text-[#166534] font-medium text-[11px]">✓ Ready</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 7: Calendar */}
      {activeTab === 'calendar' && (
        <div className="lux-card p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#121316]">Weekly Time Windows & Periods</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {calendar.slice(0, 8).map(s => (
              <div key={s.id} className="p-3.5 rounded-lg bg-white border border-[#E8E7E3] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#121316]">Period {s.periodIndex + 1}</span>
                  {s.isBreak && <span className="badge badge-warning text-[9px]">Break</span>}
                </div>
                <div className="text-xs text-[#575A65]">{s.startTime} – {s.endTime}</div>
                <div className="text-[11px] text-[#8B8E99]">{s.label || 'Standard Academic Slot'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceManagementView;
