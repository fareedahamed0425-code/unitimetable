import React, { useState, useEffect } from 'react';
import {
  Network,
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  Building,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  DoorOpen
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
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Edit / Add states for Venues
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [roomFormData, setRoomFormData] = useState({
    name: '',
    code: '',
    buildingId: '',
    capacity: 60,
    type: 'CLASSROOM',
    floor: 1
  });
  const [showAddBuildingModal, setShowAddBuildingModal] = useState(false);
  const [newBuildingData, setNewBuildingData] = useState({ name: '', code: '' });

  // Edit / Add states for Periods & Calendar
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [slotFormData, setSlotFormData] = useState({
    day: 0,
    startTime: '08:30',
    endTime: '09:30',
    label: '',
    isBreak: false
  });

  // Edit / Add states for Sections & Cohorts
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [sectionFormData, setSectionFormData] = useState({
    name: '',
    semesterId: ''
  });

  const showToast = (text: string, isError = false) => {
    setToastMsg({ text, isError });
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [h, t, c, a, inf, cal] = await Promise.all([
        api.getHierarchy().catch(() => null),
        api.getTeachers().catch(() => []),
        api.getCourses().catch(() => []),
        api.getActivities().catch(() => []),
        api.getAdminRooms().catch(() => ({ buildings: [], rooms: [] })),
        api.getAdminSlots().catch(() => [])
      ]);
      setHierarchy(h);
      setTeachers(t || []);
      setCourses(c || []);
      setActivities(a || []);
      setInfra(inf || { buildings: [], rooms: [] });
      setCalendar(cal || []);
      if (inf?.buildings?.length && !roomFormData.buildingId) {
        setRoomFormData(prev => ({ ...prev, buildingId: inf.buildings[0].id }));
      }
    } catch (e: any) {
      console.error('Failed to load resources:', e);
    } finally {
      setLoading(false);
    }
  };

  // Venue CRUD Handlers
  const handleSaveRoom = async (roomId: string, data: Partial<Room>) => {
    try {
      await api.updateRoom(roomId, data);
      showToast('Venue / Room updated successfully');
      setEditingRoomId(null);
      loadAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to update venue', true);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addRoom(roomFormData);
      showToast('New room added successfully');
      setShowAddRoomModal(false);
      setRoomFormData({ name: '', code: '', buildingId: infra.buildings[0]?.id || '', capacity: 60, type: 'CLASSROOM', floor: 1 });
      loadAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to add room', true);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!window.confirm('Delete this venue / room?')) return;
    try {
      await api.deleteRoom(id);
      showToast('Room deleted');
      loadAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete room', true);
    }
  };

  const handleAddBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addBuilding(newBuildingData);
      showToast('Building added successfully');
      setShowAddBuildingModal(false);
      setNewBuildingData({ name: '', code: '' });
      loadAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to add building', true);
    }
  };

  // Time Period CRUD Handlers
  const handleSaveSlot = async (slotId: string, updatedData: any) => {
    try {
      await api.updateSlot(slotId, updatedData);
      showToast('Time period timing updated');
      setEditingSlotId(null);
      loadAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to update period', true);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addSlot(slotFormData);
      showToast('Time period created successfully');
      setShowAddSlotModal(false);
      setSlotFormData({ day: 0, startTime: '08:30', endTime: '09:30', label: '', isBreak: false });
      loadAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to add period', true);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!window.confirm('Delete this time period?')) return;
    try {
      await api.deleteSlot(id);
      showToast('Time period deleted');
      loadAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete period', true);
    }
  };

  // Section CRUD Handlers
  const handleSaveSection = async (secId: string, data: any) => {
    try {
      await api.updateSection(secId, data);
      showToast('Section name updated');
      setEditingSectionId(null);
      loadAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to update section', true);
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addSection({ ...sectionFormData, studentCount: 60 });
      showToast('Section created successfully');
      setShowAddSectionModal(false);
      setSectionFormData({ name: '', semesterId: '' });
      loadAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to add section', true);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!window.confirm('Delete this section?')) return;
    try {
      await api.deleteSection(id);
      showToast('Section deleted');
      loadAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete section', true);
    }
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const tabs = [
    { id: 'hierarchy', label: 'Hierarchy', icon: Network },
    { id: 'faculty', label: 'Faculty', icon: Users },
    { id: 'students', label: 'Student Cohorts', icon: GraduationCap },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'activities', label: 'Activities', icon: Layers },
    { id: 'infrastructure', label: 'Campus Venues & Labs (Editable)', icon: Building },
    { id: 'calendar', label: 'Periods & Calendar (Editable)', icon: Clock }
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl backdrop-blur border text-white text-sm font-semibold animate-fade-in ${
          toastMsg.isError ? 'bg-rose-600 border-rose-400/40' : 'bg-emerald-600 border-emerald-400/40'
        }`}>
          {toastMsg.isError ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header & Segmented Tab Bar */}
      <div className="lux-card p-6 bg-white border-[#E8E7E3]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-[#F4F4F1] text-[#575A65] border border-[#E8E7E3]">
              Academic Asset & Infrastructure Management
            </span>
            <h1 className="text-2xl font-bold text-[#121316] tracking-tight">University Infrastructure & Entities</h1>
            <p className="text-xs text-[#575A65]">
              Directly edit and manage class timings, base venues, lecture rooms, faculty directories, and student sections.
            </p>
          </div>

          <button
            onClick={loadAll}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#F4F4F1] hover:bg-[#E8E7E3] text-[#121316] rounded-lg text-xs font-semibold border border-[#E8E7E3] self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#2582A1]' : ''}`} />
            <span>Refresh</span>
          </button>
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
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#121316]">Faculty Members ({teachers.length})</h2>
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
                  <div>Email: <strong>{t.email || 'N/A'}</strong></div>
                  <div>Weekly Max: <strong>{t.maxHoursPerWeek || 20} hrs</strong></div>
                </div>

                <div className="pt-2 border-t border-[#F0EFEA]">
                  <span className="text-[9px] uppercase font-bold text-[#8B8E99] tracking-wider block mb-1">Qualified Courses:</span>
                  <div className="flex flex-wrap gap-1">
                    {t.qualifications?.map((q, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-[#F4F4F1] text-[#121316] border border-[#E8E7E3] font-medium">
                        {q.replace('course-', '').toUpperCase()}
                      </span>
                    )) || <span className="text-[10px] text-slate-400">All Dept Courses</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 3: Student Cohorts (Editable) */}
      {activeTab === 'students' && (
        <div className="lux-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#121316]">Student Cohorts & Sections</h2>
              <p className="text-xs text-[#575A65]">Manage academic class sections freely across departments.</p>
            </div>
            <button
              onClick={() => setShowAddSectionModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#002E4E] hover:bg-[#003B64] text-white text-xs font-semibold rounded-lg"
            >
              <Plus className="w-3.5 h-3.5 text-[#E6C200]" />
              <span>Add Section</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {hierarchy?.sections?.map((sec: any) => {
              const isEditing = editingSectionId === sec.id;
              return (
                <div key={sec.id} className="p-4 rounded-lg bg-white border border-[#E8E7E3] space-y-3">
                  <div className="flex items-center justify-between">
                    {isEditing ? (
                      <input
                        type="text"
                        defaultValue={sec.name}
                        id={`sec-name-inline-${sec.id}`}
                        className="p-1 border border-[#2582A1] rounded text-xs font-bold text-[#002E4E]"
                      />
                    ) : (
                      <div className="font-bold text-xs text-[#121316]">{sec.name}</div>
                    )}
                    <div className="flex items-center gap-1.5">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => {
                              const val = (document.getElementById(`sec-name-inline-${sec.id}`) as HTMLInputElement)?.value;
                              handleSaveSection(sec.id, { name: val });
                            }}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Save"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingSectionId(null)}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingSectionId(sec.id)}
                            className="p-1 text-[#2582A1] hover:bg-[#EBF4F7] rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSection(sec.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-[#575A65]">
                    Status: <span className="font-semibold text-emerald-700">Active Academic Cohort</span>
                  </div>
                </div>
              );
            })}
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 6: Campus Venues & Labs (EDITABLE) */}
      {activeTab === 'infrastructure' && (
        <div className="lux-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#121316]">Rooms, Laboratories & Buildings ({infra.rooms?.length || 0})</h2>
              <p className="text-xs text-[#575A65]">Directly edit room names, codes, capacities, and types.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddBuildingModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F4F4F1] hover:bg-[#E8E7E3] text-[#121316] text-xs font-semibold rounded-lg border border-[#E8E7E3]"
              >
                <Building className="w-3.5 h-3.5 text-[#2582A1]" />
                <span>Add Building</span>
              </button>
              <button
                onClick={() => setShowAddRoomModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#002E4E] hover:bg-[#003B64] text-white text-xs font-semibold rounded-lg"
              >
                <Plus className="w-3.5 h-3.5 text-[#E6C200]" />
                <span>Add Venue/Room</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {infra.rooms?.map(r => {
              const isEditing = editingRoomId === r.id;
              return (
                <div key={r.id} className="p-4 rounded-lg bg-white border border-[#E8E7E3] space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      {isEditing ? (
                        <input
                          type="text"
                          defaultValue={r.name}
                          id={`room-name-res-${r.id}`}
                          className="p-1 border border-[#2582A1] rounded text-xs font-bold text-[#002E4E]"
                        />
                      ) : (
                        <div className="font-bold text-xs text-[#121316]">{r.name}</div>
                      )}
                      <div className="text-[11px] text-[#8B8E99]">{r.code} • Floor {r.floor || 1}</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => {
                              const nameVal = (document.getElementById(`room-name-res-${r.id}`) as HTMLInputElement)?.value;
                              handleSaveRoom(r.id, { name: nameVal });
                            }}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Save"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingRoomId(null)}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingRoomId(r.id)}
                            className="p-1 text-[#2582A1] hover:bg-[#EBF4F7] rounded"
                            title="Edit Venue"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(r.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete Venue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-[#575A65] pt-2 border-t border-[#F0EFEA] flex items-center justify-between">
                    <span>Type: <strong>{r.roomType || (r as any).type || 'CLASSROOM'}</strong></span>
                    <span className="text-[#166534] font-medium text-[11px]">✓ Configured</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Content 7: Periods & Calendar (EDITABLE) */}
      {activeTab === 'calendar' && (
        <div className="lux-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#121316]">Weekly Time Windows & Periods ({calendar?.length || 0})</h2>
              <p className="text-xs text-[#575A65]">Directly edit start times, end times, labels, and breaks for daily schedule periods.</p>
            </div>
            <button
              onClick={() => setShowAddSlotModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#002E4E] hover:bg-[#003B64] text-white text-xs font-semibold rounded-lg self-start"
            >
              <Plus className="w-3.5 h-3.5 text-[#E6C200]" />
              <span>Add Period</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {calendar.map(s => {
              const isEditing = editingSlotId === s.id;
              return (
                <div key={s.id} className="p-3.5 rounded-lg bg-white border border-[#E8E7E3] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-[#121316]">
                        {s.dayName || daysOfWeek[s.dayOfWeek || 0]} • Period {(s.periodIndex || 0) + 1}
                      </span>
                      {s.isBreak && <span className="badge badge-warning text-[9px] ml-1.5">Break</span>}
                    </div>

                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => {
                              const start = (document.getElementById(`slot-start-res-${s.id}`) as HTMLInputElement)?.value;
                              const end = (document.getElementById(`slot-end-res-${s.id}`) as HTMLInputElement)?.value;
                              handleSaveSlot(s.id, { startTime: start, endTime: end });
                            }}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Save"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingSlotId(null)}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingSlotId(s.id)}
                            className="p-1 text-[#2582A1] hover:bg-[#EBF4F7] rounded"
                            title="Edit Timing"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSlot(s.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-[#575A65]">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="time"
                          defaultValue={s.startTime}
                          id={`slot-start-res-${s.id}`}
                          className="p-1 border border-[#2582A1] rounded text-xs font-mono"
                        />
                        <span>–</span>
                        <input
                          type="time"
                          defaultValue={s.endTime}
                          id={`slot-end-res-${s.id}`}
                          className="p-1 border border-[#2582A1] rounded text-xs font-mono"
                        />
                      </div>
                    ) : (
                      <span className="font-mono font-semibold text-[#002E4E]">{s.startTime} – {s.endTime}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#8B8E99]">{s.label || 'Standard Academic Slot'}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Add Room */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base text-[#002E4E]">Add Venue / Room</h3>
              <button onClick={() => setShowAddRoomModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddRoom} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Room Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab 4, LH-201"
                  value={roomFormData.name}
                  onChange={e => setRoomFormData({ ...roomFormData, name: e.target.value })}
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Room Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CR-201"
                    value={roomFormData.code}
                    onChange={e => setRoomFormData({ ...roomFormData, code: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Floor</label>
                  <input
                    type="number"
                    value={roomFormData.floor}
                    onChange={e => setRoomFormData({ ...roomFormData, floor: parseInt(e.target.value, 10) || 1 })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowAddRoomModal(false)} className="px-3 py-1.5 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-[#002E4E] text-white font-semibold rounded-lg">Save Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Period */}
      {showAddSlotModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base text-[#002E4E]">Add Time Period</h3>
              <button onClick={() => setShowAddSlotModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddSlot} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Day of Week</label>
                <select
                  value={slotFormData.day}
                  onChange={e => setSlotFormData({ ...slotFormData, day: parseInt(e.target.value, 10) })}
                  className="w-full border rounded-lg p-2"
                >
                  {daysOfWeek.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={slotFormData.startTime}
                    onChange={e => setSlotFormData({ ...slotFormData, startTime: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={slotFormData.endTime}
                    onChange={e => setSlotFormData({ ...slotFormData, endTime: e.target.value })}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowAddSlotModal(false)} className="px-3 py-1.5 border rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-[#002E4E] text-white font-semibold rounded-lg">Create Period</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceManagementView;

