import React, { useState } from 'react';
import { Clock, Coffee, Shield, Building, User, Save, X, Calendar } from 'lucide-react';
import { api } from '../../api';

interface FacultyConstraintsModalProps {
  faculty: any;
  onClose: () => void;
  onSaved: () => void;
}

const DEPARTMENTS = [
  { id: 'dept-cse', name: 'Computer Science & Engineering', code: 'CSE' },
  { id: 'dept-aids', name: 'Artificial Intelligence & Data Science', code: 'AI&DS' },
  { id: 'dept-aiml', name: 'Artificial Intelligence & Machine Learning', code: 'AI&ML' },
  { id: 'dept-cs', name: 'Cyber Security', code: 'Cyber Sec' }
];

export const FacultyConstraintsModal: React.FC<FacultyConstraintsModalProps> = ({
  faculty,
  onClose,
  onSaved
}) => {
  const [name, setName] = useState(faculty.name || '');
  const [email, setEmail] = useState(faculty.email || '');
  const [designation, setDesignation] = useState(faculty.designation || 'Assistant Professor');
  const [departmentIds, setDepartmentIds] = useState<string[]>(
    faculty.departmentIds && faculty.departmentIds.length > 0
      ? faculty.departmentIds
      : [faculty.departmentId || 'dept-cse']
  );
  const [availableStartTime, setAvailableStartTime] = useState(faculty.availableStartTime || '09:00');
  const [availableEndTime, setAvailableEndTime] = useState(faculty.availableEndTime || '17:00');
  const [lunchBreakPeriod, setLunchBreakPeriod] = useState<number>(faculty.lunchBreakPeriod ?? 4);
  const [maxHoursPerDay, setMaxHoursPerDay] = useState<number>(faculty.maxHoursPerDay || 5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDept = (deptId: string) => {
    if (departmentIds.includes(deptId)) {
      if (departmentIds.length === 1) return; // Keep at least one
      setDepartmentIds(departmentIds.filter(id => id !== deptId));
    } else {
      setDepartmentIds([...departmentIds, deptId]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        email,
        designation,
        department_id: departmentIds[0] || 'dept-cse',
        department_ids: departmentIds,
        available_start_time: availableStartTime,
        available_end_time: availableEndTime,
        lunch_break_period: Number(lunchBreakPeriod),
        max_hours_per_day: Number(maxHoursPerDay)
      };

      let res;
      if (faculty.id && !faculty.id.startsWith('new-')) {
        res = await api.updateAdminTeacher(faculty.id, payload);
      } else {
        res = await api.addAdminTeacher(payload);
      }

      if (res.success) {
        onSaved();
      } else {
        setError(res.error || res.message || 'Failed to save faculty');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving faculty constraints');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#D8E6ED] max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-[#002E4E] flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              {faculty.id ? `Faculty Profile & Constraints: ${faculty.name}` : 'Register New Faculty Member'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure working shifts, lunch breaks, and multi-department teaching affiliations.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600:text-slate-200 font-bold p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Faculty Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Dr. Alan Turing"
                required
                className="w-full px-3 py-2 text-sm border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Designation
              </label>
              <select
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Professor & HOD">Professor & HOD</option>
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Senior Lecturer">Senior Lecturer</option>
                <option value="Lab Instructor">Lab Instructor</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. alan.turing@apollouniversity.edu.in"
              required
              className="w-full px-3 py-2 text-sm border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Multi-Department Affiliation Selection */}
          <div className="bg-[#F4F8FA] p-3.5 rounded-xl border border-[#D8E6ED] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-600" /> Multi-Department Affiliations
              </label>
              <span className="text-[11px] text-slate-500">
                (Cross-department faculty teaching in multiple branches)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {DEPARTMENTS.map(dept => {
                const checked = departmentIds.includes(dept.id);
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => toggleDept(dept.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all border flex items-center justify-between ${
                      checked
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                        : 'bg-white text-slate-700 border-[#D8E6ED] hover:bg-slate-100:bg-slate-700/50'
                    }`}
                  >
                    <span>{dept.name} ({dept.code})</span>
                    {checked && <span className="text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Working Hours & Shift Windows */}
          <div className="bg-[#F4F8FA] p-3.5 rounded-xl border border-[#D8E6ED] space-y-3">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" /> Daily Working Time Window
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] text-slate-500 mb-1">
                  Shift Start Time
                </span>
                <input
                  type="time"
                  value={availableStartTime}
                  onChange={e => setAvailableStartTime(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-[#D8E6ED] rounded-lg bg-white text-[#002E4E]"
                />
              </div>

              <div>
                <span className="block text-[11px] text-slate-500 mb-1">
                  Shift End Time
                </span>
                <input
                  type="time"
                  value={availableEndTime}
                  onChange={e => setAvailableEndTime(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-[#D8E6ED] rounded-lg bg-white text-[#002E4E]"
                />
              </div>
            </div>
          </div>

          {/* Lunch Break & Max Classes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Coffee className="w-3.5 h-3.5 text-amber-600" /> Designated Lunch Period
              </label>
              <select
                value={lunchBreakPeriod}
                onChange={e => setLunchBreakPeriod(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-indigo-500"
              >
                <option value={3}>Period 3 (11:15 AM - 12:15 PM)</option>
                <option value={4}>Period 4 (12:15 PM - 01:15 PM) - Default</option>
                <option value={5}>Period 5 (01:15 PM - 02:00 PM)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-indigo-600" /> Max Teaching Hours/Day
              </label>
              <input
                type="number"
                value={maxHoursPerDay}
                onChange={e => setMaxHoursPerDay(Number(e.target.value))}
                min={1}
                max={8}
                className="w-full px-3 py-2 text-xs border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-md transition-all"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Faculty Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
