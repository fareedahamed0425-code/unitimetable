import React, { useState, useEffect } from 'react';
import {
  Layers,
  Users,
  Building,
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  Split,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  GraduationCap,
  ChevronRight,
  School,
  AlertCircle
} from 'lucide-react';
import { api } from '../../api';

interface SectionItem {
  id: string;
  name: string;
  studentCount: number;
  semesterId?: string;
  semesterNumber?: number;
  homeRoomId?: string | null;
  roomName?: string | null;
  classTeacherId?: string | null;
  classTeacherName?: string | null;
}

interface DepartmentGroup {
  deptId: string;
  deptName: string;
  deptCode: string;
  sections: SectionItem[];
}

interface YearHierarchy {
  year: number;
  yearLabel: string;
  departments: DepartmentGroup[];
}

export const CohortHierarchyManagerView: React.FC = () => {
  const [hierarchy, setHierarchy] = useState<YearHierarchy[]>([]);
  const [activeYear, setActiveYear] = useState<number>(3);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Reference data for selects
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);
  const [cohortBatches, setCohortBatches] = useState<any[]>([]);
  const [cohortSemesters, setCohortSemesters] = useState<any[]>([]);

  // Modals
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    student_count: 60,
    home_room_id: '',
    class_teacher_id: '',
    department_id: ''
  });

  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitForm, setSplitForm] = useState({
    deptId: '',
    deptName: '',
    deptCode: '',
    batchId: '',
    semesterId: '',
    baseName: 'CSE',
    sectionCount: 2,
    totalStudents: 120
  });

  useEffect(() => {
    loadHierarchyData();
  }, []);

  const loadHierarchyData = async () => {
    setLoading(true);
    try {
      const [hierData, roomsData, teachersData, cohortData] = await Promise.all([
        api.getHierarchyFull(),
        api.getAdminRooms(),
        api.getAdminTeachers(),
        api.getCohorts()
      ]);

      setHierarchy(hierData || []);
      setAvailableRooms(roomsData.rooms || []);
      setAvailableTeachers(teachersData || []);
      setCohortBatches(cohortData.batches || []);
      setCohortSemesters(cohortData.semesters || []);
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to load cohort hierarchy', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSectionClick = (dept: DepartmentGroup, sec: SectionItem) => {
    setEditingSection(sec);
    setEditForm({
      name: sec.name,
      student_count: sec.studentCount || 60,
      home_room_id: sec.homeRoomId || '',
      class_teacher_id: sec.classTeacherId || '',
      department_id: dept.deptId
    });
  };

  const handleSaveSectionDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    setSaving(true);
    try {
      const res = await api.updateSectionDetailed(editingSection.id, {
        name: editForm.name,
        student_count: Number(editForm.student_count),
        home_room_id: editForm.home_room_id || undefined,
        class_teacher_id: editForm.class_teacher_id || undefined,
        department_id: editForm.department_id || undefined
      });
      if (res.success) {
        setMessage({ text: `Section ${editForm.name} updated successfully.`, type: 'success' });
        setEditingSection(null);
        await loadHierarchyData();
      } else {
        setMessage({ text: res.message || 'Update failed', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update section', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenSplitModal = (dept: DepartmentGroup) => {
    // Determine appropriate batch and semester for activeYear
    const targetSemNum = activeYear === 1 ? 1 : activeYear === 2 ? 3 : activeYear === 3 ? 5 : 7;
    const matchingSem = cohortSemesters.find(s => s.semester_number === targetSemNum) || cohortSemesters[0];
    const matchingBatch = cohortBatches.find(b => b.dept_code === dept.deptCode) || cohortBatches[0];

    setSplitForm({
      deptId: dept.deptId,
      deptName: dept.deptName,
      deptCode: dept.deptCode,
      batchId: matchingBatch?.id || 'batch-cse-2024',
      semesterId: matchingSem?.id || 'sem-cse-5',
      baseName: `${dept.deptCode}`,
      sectionCount: 2,
      totalStudents: 120
    });
    setSplitModalOpen(true);
  };

  const handleExecuteSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.bulkDivideSections({
        batchId: splitForm.batchId,
        semesterId: splitForm.semesterId,
        baseName: splitForm.baseName,
        sectionCount: Number(splitForm.sectionCount),
        totalStudents: Number(splitForm.totalStudents)
      });

      if (res.success) {
        setMessage({ text: res.message || 'Sections divided successfully', type: 'success' });
        setSplitModalOpen(false);
        await loadHierarchyData();
      } else {
        setMessage({ text: res.message || 'Division failed', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to divide sections', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove section "${name}"?`)) return;
    try {
      await api.deleteSection(id);
      setMessage({ text: `Section "${name}" removed.`, type: 'success' });
      await loadHierarchyData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to delete section', type: 'error' });
    }
  };

  const currentYearData = hierarchy.find(h => h.year === activeYear) || hierarchy[0];

  const totalStudentsInYear = (currentYearData?.departments || []).reduce(
    (acc, d) => acc + d.sections.reduce((sAcc, s) => sAcc + (s.studentCount || 0), 0),
    0
  );

  const totalSectionsInYear = (currentYearData?.departments || []).reduce(
    (acc, d) => acc + d.sections.length,
    0
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Hero Header */}
      <div className="bg-white rounded-2xl p-6 text-[#002E4E] shadow-sm border border-[#D8E6ED] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-[#2582A1] text-xs font-semibold uppercase tracking-wider mb-1">
              <School className="w-4 h-4 text-[#2582A1]" /> Academic Governance & Student Distribution
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#002E4E] flex items-center gap-3">
              Year-Wise Cohort & Section Manager
            </h1>
            <p className="text-[#4A6375] text-sm mt-1 max-w-2xl">
              Partition undergraduate cohorts across all 4 departments with exact student counts, dedicated home classrooms, and assigned class mentors.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={loadHierarchyData}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#F4F8FA] hover:bg-[#EBF3F7] text-[#002E4E] rounded-xl text-xs font-semibold border border-[#D8E6ED] transition-all shadow-2xs cursor-pointer"
              title="Refresh Hierarchy"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#2582A1] ${loading ? 'animate-spin' : ''}`} /> Sync Data
            </button>
          </div>
        </div>

        {/* Global Year Overview Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#D8E6ED]">
          {[1, 2, 3, 4].map(yr => {
            const yData = hierarchy.find(h => h.year === yr);
            const count = (yData?.departments || []).reduce(
              (acc, d) => acc + d.sections.reduce((sAcc, s) => sAcc + (s.studentCount || 0), 0),
              0
            );
            const secCount = (yData?.departments || []).reduce(
              (acc, d) => acc + d.sections.length,
              0
            );
            const isSelected = activeYear === yr;

            return (
              <button
                key={yr}
                onClick={() => setActiveYear(yr)}
                className={`p-3.5 rounded-xl text-left transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-[#E8F4F8] text-[#002E4E] border-[#2582A1] shadow-sm ring-2 ring-[#2582A1]/20'
                    : 'bg-[#F4F8FA] hover:bg-[#EBF3F7] text-[#002E4E] border-[#D8E6ED]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-medium text-[#4A6375]">
                  <span>Year {yr}</span>
                  <GraduationCap className={`w-3.5 h-3.5 ${isSelected ? 'text-[#2582A1]' : 'text-[#829BA8]'}`} />
                </div>
                <div className="text-lg font-bold mt-0.5 text-[#002E4E]">
                  {yr === 1 ? '1st Year' : yr === 2 ? '2nd Year' : yr === 3 ? '3rd Year' : '4th Year'}
                </div>
                <div className="text-[11px] text-[#4A6375] mt-1">
                  {count} Students • {secCount} Sections
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between transition-all shadow-sm border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs font-bold opacity-60 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Year Detail Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#D8E6ED] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
            Y{activeYear}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {activeYear === 1 ? 'First Year (Freshmen)' : activeYear === 2 ? 'Second Year (Sophomores)' : activeYear === 3 ? 'Third Year (Juniors)' : 'Fourth Year (Seniors)'} Cohort Distribution
            </h2>
            <p className="text-xs text-slate-500">
              Departmental breakdown across Computer Science, AI&DS, AIML, and Cyber Security.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="bg-slate-100 px-3 py-1.5 rounded-lg border border-[#D8E6ED]">
            <span className="text-slate-500">Total Year Enrolment: </span>
            <span className="font-bold text-slate-800">{totalStudentsInYear} Students</span>
          </div>
          <div className="bg-slate-100 px-3 py-1.5 rounded-lg border border-[#D8E6ED]">
            <span className="text-slate-500">Total Sections: </span>
            <span className="font-bold text-slate-800">{totalSectionsInYear} Sections</span>
          </div>
        </div>
      </div>

      {/* 4 Core Department Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(currentYearData?.departments || []).map(dept => {
          const deptTotalStudents = dept.sections.reduce((acc, s) => acc + (s.studentCount || 0), 0);

          return (
            <div
              key={dept.deptId}
              className="bg-white rounded-2xl border border-[#D8E6ED] shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
            >
              {/* Dept Card Header */}
              <div className="p-5 border-b border-slate-100 bg-[#F4F8FA]/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      {dept.deptCode}
                    </span>
                    <h3 className="text-base font-bold text-[#002E4E]">
                      {dept.deptName}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {dept.sections.length} Active {dept.sections.length === 1 ? 'Section' : 'Sections'} • {deptTotalStudents} Registered Students
                  </p>
                </div>

                <button
                  onClick={() => handleOpenSplitModal(dept)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700:bg-indigo-900/60 rounded-xl text-xs font-semibold border border-indigo-200 transition-colors shadow-xs"
                >
                  <Split className="w-3.5 h-3.5" /> Subdivide Batch
                </button>
              </div>

              {/* Sections List */}
              <div className="p-5 space-y-3 flex-1">
                {dept.sections.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center border-2 border-dashed border-[#D8E6ED] rounded-xl">
                    <Users className="w-8 h-8 opacity-40 mb-2" />
                    <span>No sections configured for this department in Year {activeYear}.</span>
                    <button
                      onClick={() => handleOpenSplitModal(dept)}
                      className="mt-2 text-indigo-600 font-semibold hover:underline"
                    >
                      + Create or Subdivide into Sections
                    </button>
                  </div>
                ) : (
                  dept.sections.map(sec => (
                    <div
                      key={sec.id}
                      className="p-3.5 rounded-xl border border-[#D8E6ED] bg-[#F4F8FA]/40 hover:border-blue-300:border-blue-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#002E4E]">
                            {sec.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                            {sec.studentCount || 60} Students
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            {sec.roomName || 'Room Unassigned'}
                          </span>
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            {sec.classTeacherName || 'Mentor Unassigned'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => handleEditSectionClick(dept, sec)}
                          className="p-1.5 text-slate-600 hover:text-blue-600:text-blue-400 hover:bg-blue-50:bg-blue-950/50 rounded-lg transition-colors"
                          title="Edit Section Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSection(sec.id, sec.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600:text-rose-400 hover:bg-rose-50:bg-rose-950/50 rounded-lg transition-colors"
                          title="Delete Section"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Summary Footer */}
              <div className="px-5 py-3 bg-[#F4F8FA] border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Classroom assignment status</span>
                <span className="font-semibold text-slate-700">
                  {dept.sections.filter(s => Boolean(s.homeRoomId)).length} / {dept.sections.length} Rooms Allocated
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Section Details Modal */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D8E6ED] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-[#002E4E] flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" /> Configure Section: {editingSection.name}
              </h3>
              <button
                onClick={() => setEditingSection(null)}
                className="text-slate-400 hover:text-slate-600:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSectionDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Section Code / Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Exact Student Capacity / Headcount
                </label>
                <input
                  type="number"
                  value={editForm.student_count}
                  onChange={e => setEditForm({ ...editForm, student_count: Number(e.target.value) })}
                  min={1}
                  max={250}
                  required
                  className="w-full px-3 py-2 text-sm border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dedicated Home Classroom / Venue
                </label>
                <select
                  value={editForm.home_room_id}
                  onChange={e => setEditForm({ ...editForm, home_room_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Unassigned / Flexible Room --</option>
                  {availableRooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code}) - Cap: {r.capacity}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class Mentor / Class Teacher
                </label>
                <select
                  value={editForm.class_teacher_id}
                  onChange={e => setEditForm({ ...editForm, class_teacher_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Class Teacher --</option>
                  {availableTeachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.designation || 'Faculty'}) - {t.departmentName || t.departmentCode}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Subdivide Batch Modal */}
      {splitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D8E6ED] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-[#002E4E] flex items-center gap-2">
                  <Split className="w-4 h-4 text-indigo-600" /> Subdivide Batch into Sections
                </h3>
                <p className="text-xs text-slate-500">
                  {splitForm.deptName} • Year {activeYear}
                </p>
              </div>
              <button
                onClick={() => setSplitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteSplit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prefix / Base Section Name
                </label>
                <input
                  type="text"
                  value={splitForm.baseName}
                  onChange={e => setSplitForm({ ...splitForm, baseName: e.target.value })}
                  placeholder="e.g. CSE or AIDS or AIML"
                  required
                  className="w-full px-3 py-2 text-sm border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Generated sections will be named: {splitForm.baseName}-A, {splitForm.baseName}-B, etc.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Number of Sections
                  </label>
                  <input
                    type="number"
                    value={splitForm.sectionCount}
                    onChange={e => setSplitForm({ ...splitForm, sectionCount: Math.max(1, Number(e.target.value)) })}
                    min={1}
                    max={6}
                    required
                    className="w-full px-3 py-2 text-sm border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Student Cohort
                  </label>
                  <input
                    type="number"
                    value={splitForm.totalStudents}
                    onChange={e => setSplitForm({ ...splitForm, totalStudents: Math.max(1, Number(e.target.value)) })}
                    min={1}
                    max={500}
                    required
                    className="w-full px-3 py-2 text-sm border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="bg-[#F4F8FA] p-3 rounded-xl border border-[#D8E6ED] text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Division Preview: </span>
                <span>
                  Will create {splitForm.sectionCount} sections with approx.{' '}
                  <strong>{Math.floor(splitForm.totalStudents / splitForm.sectionCount)} students</strong> each.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSplitModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-md transition-all"
                >
                  {saving ? 'Dividing...' : 'Generate Sections'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
