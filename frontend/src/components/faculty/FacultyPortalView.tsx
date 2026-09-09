import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UserPlus,
  Upload,
  FileText,
  Clock,
  Coffee,
  Building,
  Shield,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Mail,
  Sliders,
  Trash2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import { api } from '../../api';
import { FacultyConstraintsModal } from './FacultyConstraintsModal';

export const FacultyPortalView: React.FC = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Upload PDF state
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [rawPastedText, setRawPastedText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editing constraints modal
  const [selectedFaculty, setSelectedFaculty] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Email Dispatch Modal
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<any | null>(null);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminTeachers();
      setTeachers(data || []);
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to fetch faculty list', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setMessage(null);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = (e.target?.result as string).split(',')[1];
          const res = await api.uploadFacultyPdf({ fileBase64: base64Data });

          if (res.success) {
            setMessage({
              text: res.message || `Extracted and synchronized ${res.facultyCount} faculty members successfully.`,
              type: 'success'
            });
            setUploadModalOpen(false);
            await loadTeachers();
          } else {
            setMessage({ text: res.error || 'Failed to parse faculty document', type: 'error' });
          }
        } catch (err: any) {
          setMessage({ text: err.message || 'Error uploading file', type: 'error' });
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setMessage({ text: err.message || 'Error processing file', type: 'error' });
      setUploading(false);
    }
  };

  const handlePastedTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawPastedText.trim()) return;
    setUploading(true);
    try {
      const res = await api.uploadFacultyPdf({ rawText: rawPastedText });
      if (res.success) {
        setMessage({
          text: res.message || `Extracted and synchronized ${res.facultyCount} faculty members successfully.`,
          type: 'success'
        });
        setUploadModalOpen(false);
        setRawPastedText('');
        await loadTeachers();
      } else {
        setMessage({ text: res.error || 'Failed to parse text', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error parsing text', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove faculty member "${name}"?`)) return;
    try {
      await api.deleteAdminTeacher(id);
      setMessage({ text: `Faculty member "${name}" deleted.`, type: 'success' });
      await loadTeachers();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to delete faculty', type: 'error' });
    }
  };

  const handleDispatchTimetables = async () => {
    if (!window.confirm('Dispatch personalized timetables via email to all active faculty members?')) return;
    setDispatching(true);
    try {
      const res = await api.dispatchTimetables();
      if (res.success) {
        setDispatchResult(res);
        setMessage({
          text: `Dispatched timetables: ${res.sentCount} sent, ${res.skippedCount} skipped, ${res.failedCount} failed.`,
          type: 'success'
        });
      } else {
        setMessage({ text: res.error || 'Dispatch failed', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error during dispatch', type: 'error' });
    } finally {
      setDispatching(false);
    }
  };

  // Filter teachers
  const filteredTeachers = teachers.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.departmentNames && t.departmentNames.some((d: string) => d.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;

    if (selectedDeptFilter === 'ALL') return true;
    if (selectedDeptFilter === 'MULTI') return t.departmentIds && t.departmentIds.length > 1;
    return t.departmentIds && t.departmentIds.includes(selectedDeptFilter);
  });

  const multiDeptCount = teachers.filter(t => t.departmentIds && t.departmentIds.length > 1).length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Hero Header */}
      <div className="bg-white rounded-2xl p-6 text-[#002E4E] shadow-sm border border-[#D8E6ED] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-[#2582A1] text-xs font-semibold uppercase tracking-wider mb-1">
              <Users className="w-4 h-4 text-[#2582A1]" /> Faculty Directory & Time Windows
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#002E4E] flex items-center gap-3">
              Faculty Portal & Document Ingestion
            </h1>
            <p className="text-[#4A6375] text-sm mt-1 max-w-2xl">
              Ingest faculty rosters directly from PDF documents, map multi-department teaching affiliations without clashes, and enforce working shifts and lunch breaks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setSelectedFaculty({
                  id: `new-${Date.now()}`,
                  name: '',
                  email: '',
                  designation: 'Assistant Professor',
                  departmentIds: ['dept-cse'],
                  availableStartTime: '09:00',
                  availableEndTime: '17:00',
                  lunchBreakPeriod: 4,
                  maxHoursPerDay: 5
                });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Add Faculty
            </button>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#002E4E] hover:bg-[#001E33] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#FDB931]" /> Ingest PDF Roster
            </button>

            <button
              onClick={handleDispatchTimetables}
              disabled={dispatching}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#F4F8FA] hover:bg-[#EBF3F7] text-[#002E4E] rounded-xl text-xs font-semibold border border-[#D8E6ED] transition-all shadow-2xs cursor-pointer"
              title="Send personalized timetables by email"
            >
              <Mail className={`w-4 h-4 text-[#2582A1] ${dispatching ? 'animate-bounce' : ''}`} />
              {dispatching ? 'Dispatching...' : 'Email Schedules'}
            </button>
          </div>
        </div>

        {/* Global Statistics Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#D8E6ED] text-xs">
          <div className="bg-[#F4F8FA] p-3 rounded-xl border border-[#D8E6ED]">
            <span className="text-[#4A6375] block font-medium">Total Active Faculty</span>
            <span className="text-xl font-bold text-[#002E4E] mt-0.5">{teachers.length} Professors</span>
          </div>

          <div className="bg-[#F4F8FA] p-3 rounded-xl border border-[#D8E6ED]">
            <span className="text-[#4A6375] block font-medium">Multi-Department Faculty</span>
            <span className="text-xl font-bold text-emerald-700 mt-0.5">{multiDeptCount} Shared</span>
          </div>

          <div className="bg-[#F4F8FA] p-3 rounded-xl border border-[#D8E6ED]">
            <span className="text-[#4A6375] block font-medium">Shift Timing Window</span>
            <span className="text-xl font-bold text-[#2582A1] mt-0.5">09:00 - 17:00</span>
          </div>

          <div className="bg-[#F4F8FA] p-3 rounded-xl border border-[#D8E6ED]">
            <span className="text-[#4A6375] block font-medium">Standard Lunch Period</span>
            <span className="text-xl font-bold text-amber-700 mt-0.5">P4 (12:15-13:15)</span>
          </div>
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

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#D8E6ED] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Department Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {[
            { id: 'ALL', label: 'All Faculty' },
            { id: 'dept-cse', label: 'CSE' },
            { id: 'dept-aids', label: 'AI & DS' },
            { id: 'dept-aiml', label: 'AI & ML' },
            { id: 'dept-cs', label: 'Cyber Security' },
            { id: 'MULTI', label: `Multi-Dept (${multiDeptCount})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedDeptFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedDeptFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, department..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Faculty Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
          <span>Loading faculty directory...</span>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center bg-white rounded-2xl border border-[#D8E6ED] p-8">
          <Users className="w-12 h-12 opacity-30 mb-3" />
          <span className="font-semibold text-slate-700">No faculty members found matching your criteria.</span>
          <p className="text-xs text-slate-400 mt-1">Try changing the department filter or upload a roster document.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeachers.map(teacher => {
            const isMultiDept = teacher.departmentIds && teacher.departmentIds.length > 1;

            return (
              <div
                key={teacher.id}
                className="bg-white rounded-2xl border border-[#D8E6ED] shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-[#002E4E] leading-tight">
                        {teacher.name}
                      </h3>
                      <p className="text-xs text-indigo-600 font-medium mt-0.5">
                        {teacher.designation || 'Assistant Professor'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                        {teacher.email}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedFaculty(teacher);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600:text-indigo-400 hover:bg-indigo-50:bg-indigo-950/40 rounded-lg transition-colors"
                        title="Configure Constraints & Shifts"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600:text-rose-400 hover:bg-rose-50:bg-rose-950/40 rounded-lg transition-colors"
                        title="Delete Faculty"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Multi-Department Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3.5">
                    {(teacher.departmentNames && teacher.departmentNames.length > 0
                      ? teacher.departmentNames
                      : [teacher.departmentName || 'Computer Science & Engineering']
                    ).map((dName: string, idx: number) => (
                      <span
                        key={idx}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          isMultiDept
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {dName}
                      </span>
                    ))}
                    {isMultiDept && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        Cross-Dept
                      </span>
                    )}
                  </div>
                </div>

                {/* Constraints Pillbox */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{teacher.availableStartTime || '09:00'} - {teacher.availableEndTime || '17:00'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Coffee className="w-3.5 h-3.5 text-amber-500" />
                    <span>Lunch: Period {teacher.lunchBreakPeriod ?? 4}</span>
                  </div>

                  <div className="flex items-center gap-1.5 col-span-2">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>Max {teacher.maxHoursPerDay || 5} hrs/day • {teacher.maxHoursPerWeek || 20} hrs/week</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Constraints Modal */}
      {isModalOpen && selectedFaculty && (
        <FacultyConstraintsModal
          faculty={selectedFaculty}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedFaculty(null);
          }}
          onSaved={async () => {
            setIsModalOpen(false);
            setSelectedFaculty(null);
            setMessage({ text: 'Faculty profile and constraints saved.', type: 'success' });
            await loadTeachers();
          }}
        />
      )}

      {/* PDF / Roster Ingestion Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D8E6ED] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-[#002E4E] flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-600" /> Ingest Faculty Roster Document
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload PDF roster, Excel faculty sheet, or paste raw text.
                </p>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-500:border-indigo-400 rounded-2xl p-6 text-center cursor-pointer bg-indigo-50/40 transition-all"
            >
              <FileText className="w-10 h-10 text-indigo-600 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-bold text-slate-800">
                Click to browse or drop PDF / Doc roster file
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports .pdf, .docx, .xlsx with automated name and department extraction.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.docx,.txt"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#D8E6ED]"></div>
              <span className="flex-shrink mx-4 text-[11px] font-bold text-slate-400 uppercase">Or Paste Roster Text</span>
              <div className="flex-grow border-t border-[#D8E6ED]"></div>
            </div>

            <form onSubmit={handlePastedTextSubmit} className="space-y-3">
              <textarea
                value={rawPastedText}
                onChange={e => setRawPastedText(e.target.value)}
                placeholder="Dr. Alan Turing, Professor, CSE / AIML&#10;Dr. Grace Hopper, Assoc. Prof, Cyber Security&#10;Prof. John McCarthy, AI & DS..."
                rows={4}
                className="w-full p-3 text-xs border border-[#D8E6ED] rounded-xl bg-white text-[#002E4E] focus:ring-2 focus:ring-indigo-500 font-mono"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !rawPastedText.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {uploading ? 'Extracting...' : 'Parse & Synchronize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
