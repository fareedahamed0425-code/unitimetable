import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Building2,
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Layers,
  DoorOpen,
  Users,
  Calendar,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { api } from '../api';

type TabType = 'periods' | 'venues' | 'cohorts';

interface TimeSlotItem {
  id: string;
  day: number;
  dayName: string;
  periodIndex: number;
  startTime: string;
  endTime: string;
  label?: string;
  isBreak?: boolean;
  yearNumber?: number;
}

interface BuildingItem {
  id: string;
  name: string;
  code: string;
}

interface RoomItem {
  id: string;
  name: string;
  code: string;
  buildingId: string;
  buildingName?: string;
  capacity: number;
  type: string;
  floor?: number;
}

interface CohortHierarchy {
  year: number;
  yearLabel: string;
  departments: {
    deptId: string;
    deptName: string;
    sections: {
      id: string;
      name: string;
      studentCount: number;
      semesterId?: string;
    }[];
  }[];
}

export const AcademicSettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('periods');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Time Slots state (with Year-Specific Periods Support)
  const [slots, setSlots] = useState<TimeSlotItem[]>([]);
  const [selectedPeriodYear, setSelectedPeriodYear] = useState<number | 'ALL'>('ALL');
  const [slotSearch, setSlotSearch] = useState('');
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotFormData, setSlotFormData] = useState({
    day: 0,
    startTime: '08:30',
    endTime: '09:30',
    label: '',
    isBreak: false,
    yearNumber: 0
  });
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [showCopyYearModal, setShowCopyYearModal] = useState(false);
  const [copyYearData, setCopyYearData] = useState({ sourceYear: 0, targetYear: 1 });
  const [showApplyAllDaysModal, setShowApplyAllDaysModal] = useState(false);
  const [applyDaysData, setApplyDaysData] = useState({ year: 0, sourceDay: 0 });

  // Venues state
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  const [roomSearch, setRoomSearch] = useState('');
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState<string>('all');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomFormData, setRoomFormData] = useState({
    name: '',
    code: '',
    buildingId: '',
    capacity: 60,
    type: 'CLASSROOM',
    floor: 1
  });
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newBuildingData, setNewBuildingData] = useState({ name: '', code: '' });
  const [showAddBuildingModal, setShowAddBuildingModal] = useState(false);

  // Cohorts state
  const [hierarchy, setHierarchy] = useState<CohortHierarchy[]>([]);
  const [cohortsData, setCohortsData] = useState<any>(null);
  const [selectedYearTab, setSelectedYearTab] = useState<number>(1);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionFormData, setSectionFormData] = useState({
    name: '',
    semesterId: '',
    studentCount: 60
  });
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newBatchData, setNewBatchData] = useState({ name: '', year: 1, startYear: 2024, endYear: 2028 });
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  // Load Time Slots (with year filtering support)
  const loadSlots = useCallback(async (yearOverride?: number | 'ALL') => {
    try {
      setLoading(true);
      const targetYear = yearOverride !== undefined ? yearOverride : selectedPeriodYear;
      const data = await api.getAdminSlots(targetYear);
      const mapped: TimeSlotItem[] = (data || []).map((s: any) => ({
        id: s.id,
        day: s.day_of_week ?? s.day ?? 0,
        dayName: s.day_name || daysOfWeek[s.day_of_week ?? s.day] || `Day ${s.day_of_week ?? s.day}`,
        periodIndex: s.period_index ?? s.periodIndex ?? 0,
        startTime: s.start_time || s.startTime || '09:00',
        endTime: s.end_time || s.endTime || '10:00',
        label: s.label,
        isBreak: Boolean(s.is_break ?? s.isBreak),
        yearNumber: s.year_number ?? s.yearNumber ?? 0
      }));
      setSlots(mapped);
    } catch (err: any) {
      showToast(err.message || 'Failed to load time periods', true);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodYear]);

  // Load Venues
  const loadVenues = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAdminRooms();
      setRooms(data?.rooms || []);
      setBuildings(data?.buildings || []);
      if (data?.buildings?.length && !roomFormData.buildingId) {
        setRoomFormData(prev => ({ ...prev, buildingId: data.buildings[0].id }));
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load venues', true);
    } finally {
      setLoading(false);
    }
  }, [roomFormData.buildingId]);

  // Load Cohorts Hierarchy
  const loadCohorts = useCallback(async () => {
    try {
      setLoading(true);
      const [hierData, rawCohorts] = await Promise.all([
        api.getHierarchyFull(),
        api.getCohorts()
      ]);
      setHierarchy(hierData || []);
      setCohortsData(rawCohorts || null);
    } catch (err: any) {
      showToast(err.message || 'Failed to load cohorts', true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'periods') loadSlots();
    if (activeTab === 'venues') loadVenues();
    if (activeTab === 'cohorts') loadCohorts();
  }, [activeTab, loadSlots, loadVenues, loadCohorts]);

  // Time Slot Handlers
  const handleSaveSlot = async (slotId: string, updatedData: Partial<TimeSlotItem>) => {
    try {
      await api.updateSlot(slotId, {
        start_time: updatedData.startTime,
        end_time: updatedData.endTime,
        label: updatedData.label,
        is_break: updatedData.isBreak,
        year_number: updatedData.yearNumber
      });
      showToast('Time period updated successfully');
      setEditingSlotId(null);
      loadSlots();
    } catch (err: any) {
      showToast(err.message || 'Failed to update time period', true);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addSlot({
        day_of_week: slotFormData.day,
        day_name: daysOfWeek[slotFormData.day],
        period_index: slots.filter(s => s.day === slotFormData.day && (s.yearNumber === slotFormData.yearNumber)).length,
        start_time: slotFormData.startTime,
        end_time: slotFormData.endTime,
        label: slotFormData.label,
        is_break: slotFormData.isBreak,
        year_number: slotFormData.yearNumber
      });
      showToast('Time period added successfully');
      setShowAddSlotModal(false);
      setSlotFormData({ day: 0, startTime: '08:30', endTime: '09:30', label: '', isBreak: false, yearNumber: selectedPeriodYear === 'ALL' ? 0 : selectedPeriodYear });
      loadSlots();
    } catch (err: any) {
      showToast(err.message || 'Failed to add time period', true);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this time period?')) return;
    try {
      await api.deleteSlot(id);
      showToast('Time period deleted');
      loadSlots();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete time period', true);
    }
  };

  const handleCopyYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.copyYearSlots(copyYearData.sourceYear, copyYearData.targetYear);
      showToast(res.message || 'Period timings copied successfully');
      setShowCopyYearModal(false);
      setSelectedPeriodYear(copyYearData.targetYear);
      loadSlots(copyYearData.targetYear);
    } catch (err: any) {
      showToast(err.message || 'Failed to copy period timings', true);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAllDays = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.applyAllDaysSlots(applyDaysData.year, applyDaysData.sourceDay);
      showToast(res.message || 'Timings applied across all 6 days');
      setShowApplyAllDaysModal(false);
      loadSlots(applyDaysData.year);
    } catch (err: any) {
      showToast(err.message || 'Failed to apply timings across days', true);
    } finally {
      setLoading(false);
    }
  };

  // Venue Handlers
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addRoom(roomFormData);
      showToast('Room created successfully');
      setShowAddRoomModal(false);
      setRoomFormData({ name: '', code: '', buildingId: buildings[0]?.id || '', capacity: 60, type: 'CLASSROOM', floor: 1 });
      loadVenues();
    } catch (err: any) {
      showToast(err.message || 'Failed to add room', true);
    }
  };

  const handleSaveRoom = async (roomId: string, data: Partial<RoomItem>) => {
    try {
      await api.updateRoom(roomId, data);
      showToast('Room updated successfully');
      setEditingRoomId(null);
      loadVenues();
    } catch (err: any) {
      showToast(err.message || 'Failed to update room', true);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!window.confirm('Delete this room? Any scheduled classes in this room may be affected.')) return;
    try {
      await api.deleteRoom(id);
      showToast('Room deleted');
      loadVenues();
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
      loadVenues();
    } catch (err: any) {
      showToast(err.message || 'Failed to add building', true);
    }
  };

  // Cohort & Section Handlers
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addSection(sectionFormData);
      showToast('Section created successfully');
      setShowAddSectionModal(false);
      setSectionFormData({ name: '', semesterId: '', studentCount: 60 });
      loadCohorts();
    } catch (err: any) {
      showToast(err.message || 'Failed to add section', true);
    }
  };

  const handleSaveSection = async (sectionId: string, data: Partial<{ name: string; studentCount: number }>) => {
    try {
      await api.updateSection(sectionId, data);
      showToast('Section updated successfully');
      setEditingSectionId(null);
      loadCohorts();
    } catch (err: any) {
      showToast(err.message || 'Failed to update section', true);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!window.confirm('Delete this section? All associated timetables and schedules will be affected.')) return;
    try {
      await api.deleteSection(id);
      showToast('Section deleted');
      loadCohorts();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete section', true);
    }
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addBatch(newBatchData);
      showToast(`Batch Year ${newBatchData.year} created successfully`);
      setShowAddBatchModal(false);
      setNewBatchData({ name: '', year: 1, startYear: 2024, endYear: 2028 });
      loadCohorts();
    } catch (err: any) {
      showToast(err.message || 'Failed to add batch', true);
    }
  };

  // Filtered Slots
  const filteredSlots = slots.filter(s => {
    if (!slotSearch) return true;
    const term = slotSearch.toLowerCase();
    return s.dayName?.toLowerCase().includes(term) ||
           s.startTime?.includes(term) ||
           s.endTime?.includes(term) ||
           s.label?.toLowerCase().includes(term);
  });

  // Filtered Rooms
  const filteredRooms = rooms.filter(r => {
    const matchesBuilding = selectedBuildingFilter === 'all' || r.buildingId === selectedBuildingFilter;
    const matchesSearch = !roomSearch ||
      r.name?.toLowerCase().includes(roomSearch.toLowerCase()) ||
      r.code?.toLowerCase().includes(roomSearch.toLowerCase()) ||
      r.buildingName?.toLowerCase().includes(roomSearch.toLowerCase());
    return matchesBuilding && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Toast Notifications */}
      {successMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600/95 text-white px-4 py-3 rounded-xl shadow-2xl backdrop-blur border border-emerald-400/40 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium text-sm">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-rose-600/95 text-white px-4 py-3 rounded-xl shadow-2xl backdrop-blur border border-rose-400/40 animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium text-sm">{errorMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
                Admin Control Panel
              </span>
              <span className="text-slate-500 text-xs">• Super Admin Access</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
              Academic Settings & Infrastructure
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Configure time period slots, class venues, room capacities, and student cohort years & sections.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (activeTab === 'periods') loadSlots();
                if (activeTab === 'venues') loadVenues();
                if (activeTab === 'cohorts') loadCohorts();
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium border border-slate-700 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('periods')}
            className={`flex items-center gap-2.5 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'periods'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Time Periods & Schedules</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400">{slots.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('venues')}
            className={`flex items-center gap-2.5 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'venues'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Venues & Classrooms</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400">{rooms.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('cohorts')}
            className={`flex items-center gap-2.5 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'cohorts'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Years, Batches & Sections</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400">4 Years</span>
          </button>
        </div>
      </div>
      {/* ========================================================================= */}
      {/* TAB 1: TIME PERIODS & SLOTS (YEAR-SPECIFIC & GENERAL)                     */}
      {/* ========================================================================= */}
      {activeTab === 'periods' && (
        <div className="space-y-6">
          {/* Year Selector Tabs Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-semibold text-slate-400 pl-2 pr-1 shrink-0">Academic Year Timings:</span>
              <button
                onClick={() => {
                  setSelectedPeriodYear('ALL');
                  loadSlots('ALL');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedPeriodYear === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                All Years / General Default
              </button>
              {[1, 2, 3, 4].map(y => (
                <button
                  key={y}
                  onClick={() => {
                    setSelectedPeriodYear(y);
                    loadSlots(y);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    selectedPeriodYear === y
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span>Year {y} (B.Tech Y{y})</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedPeriodYear === y ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {slots.filter(s => s.yearNumber === y).length || slots.filter(s => s.yearNumber === 0).length} slots
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                onClick={() => {
                  setApplyDaysData({ year: selectedPeriodYear === 'ALL' ? 0 : selectedPeriodYear, sourceDay: 0 });
                  setShowApplyAllDaysModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
                title="Copy Monday's timing to Tuesday-Saturday"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sync to All 6 Days</span>
              </button>
              <button
                onClick={() => {
                  setCopyYearData({ sourceYear: selectedPeriodYear === 'ALL' ? 0 : selectedPeriodYear, targetYear: selectedPeriodYear === 1 ? 2 : 1 });
                  setShowCopyYearModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
                title="Duplicate timings to another year"
              >
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Copy Year Schedule</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={slotSearch}
                onChange={e => setSlotSearch(e.target.value)}
                placeholder="Search by day, time (e.g. 09:30), or label..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => {
                setSlotFormData(prev => ({
                  ...prev,
                  yearNumber: selectedPeriodYear === 'ALL' ? 0 : selectedPeriodYear
                }));
                setShowAddSlotModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Time Period {selectedPeriodYear !== 'ALL' ? `(Year ${selectedPeriodYear})` : ''}</span>
            </button>
          </div>

          {/* Time Slots Table */}
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-xs font-semibold tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Applicable Year</th>
                    <th className="px-6 py-4">Day</th>
                    <th className="px-6 py-4">Period</th>
                    <th className="px-6 py-4">Start Time</th>
                    <th className="px-6 py-4">End Time</th>
                    <th className="px-6 py-4">Type / Label</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSlots.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        {loading ? 'Loading time slots...' : 'No time periods found for this year. Add periods using the button above or copy from another year.'}
                      </td>
                    </tr>
                  ) : (
                    filteredSlots.map(s => {
                      const isEditing = editingSlotId === s.id;
                      const isYearSpecific = (s.yearNumber || 0) > 0;
                      return (
                        <tr key={s.id} className="hover:bg-slate-800/30 transition">
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <select
                                id={`slot-year-${s.id}`}
                                defaultValue={s.yearNumber || 0}
                                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                              >
                                <option value={0}>All Years (Default)</option>
                                <option value={1}>Year 1</option>
                                <option value={2}>Year 2</option>
                                <option value={3}>Year 3</option>
                                <option value={4}>Year 4</option>
                              </select>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                isYearSpecific
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              }`}>
                                {isYearSpecific ? `Year ${s.yearNumber}` : 'All Years (Default)'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-200">{s.dayName || daysOfWeek[s.day] || `Day ${s.day}`}</span>
                            <span className="ml-2 text-xs text-slate-500">Day {s.day}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                            P{s.periodIndex + 1}
                          </td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <input
                                type="time"
                                defaultValue={s.startTime}
                                id={`slot-start-${s.id}`}
                                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                              />
                            ) : (
                              <span className="font-mono text-indigo-300 font-medium">{s.startTime}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <input
                                type="time"
                                defaultValue={s.endTime}
                                id={`slot-end-${s.id}`}
                                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                              />
                            ) : (
                              <span className="font-mono text-indigo-300 font-medium">{s.endTime}</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  defaultValue={s.label || ''}
                                  id={`slot-label-${s.id}`}
                                  placeholder="e.g. Regular / Lunch Break"
                                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                                />
                                <label className="flex items-center gap-1 text-xs text-slate-400">
                                  <input
                                    type="checkbox"
                                    id={`slot-break-${s.id}`}
                                    defaultChecked={s.isBreak}
                                    className="rounded bg-slate-950 border-slate-700 text-indigo-600"
                                  />
                                  <span>Break</span>
                                </label>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  s.isBreak
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }}`}>
                                  {s.isBreak ? 'Break / Interval' : 'Academic Class'}
                                </span>
                                {s.label && <span className="text-xs text-slate-400">({s.label})</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    const start = (document.getElementById(`slot-start-${s.id}`) as HTMLInputElement)?.value;
                                    const end = (document.getElementById(`slot-end-${s.id}`) as HTMLInputElement)?.value;
                                    const label = (document.getElementById(`slot-label-${s.id}`) as HTMLInputElement)?.value;
                                    const isBreak = (document.getElementById(`slot-break-${s.id}`) as HTMLInputElement)?.checked;
                                    const yearNum = Number((document.getElementById(`slot-year-${s.id}`) as HTMLSelectElement)?.value || 0);
                                    handleSaveSlot(s.id, { startTime: start, endTime: end, label, isBreak, yearNumber: yearNum });
                                  }}
                                  className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg border border-emerald-500/30 transition"
                                  title="Save Changes"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingSlotId(null)}
                                  className="p-1.5 bg-slate-800 text-slate-400 hover:bg-slate-700 rounded-lg transition"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setEditingSlotId(s.id)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition"
                                  title="Edit Timing"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSlot(s.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                  title="Delete Period"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VENUES & ROOMS                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'venues' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={roomSearch}
                  onChange={e => setRoomSearch(e.target.value)}
                  placeholder="Search rooms (e.g. Lab 3, 204, LH-1)..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedBuildingFilter}
                  onChange={e => setSelectedBuildingFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Buildings</option>
                  {buildings.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddBuildingModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium border border-slate-700 transition"
              >
                <Building2 className="w-4 h-4" />
                <span>Add Building</span>
              </button>
              <button
                onClick={() => setShowAddRoomModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Venue/Room</span>
              </button>
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800">
                No venues or rooms found matching criteria.
              </div>
            ) : (
              filteredRooms.map(r => {
                const isEditing = editingRoomId === r.id;
                return (
                  <div
                    key={r.id}
                    className="p-5 bg-slate-900/50 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition relative flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-xl ${
                            r.type === 'LAB'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}>
                            <DoorOpen className="w-4 h-4" />
                          </div>
                          <div>
                            {isEditing ? (
                              <input
                                type="text"
                                defaultValue={r.name}
                                id={`room-name-${r.id}`}
                                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-sm font-semibold text-slate-100"
                              />
                            ) : (
                              <h3 className="font-bold text-slate-100 text-base">{r.name}</h3>
                            )}
                            <p className="text-xs text-slate-400">Code: {r.code || r.name}</p>
                          </div>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                          r.type === 'LAB' ? 'bg-purple-500/20 text-purple-300' : 'bg-indigo-500/20 text-indigo-300'
                        }`}>
                          {r.type}
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 block">Building</span>
                          <span className="font-medium text-slate-300">{r.buildingName || 'Main Block'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Capacity</span>
                          {isEditing ? (
                            <input
                              type="number"
                              defaultValue={r.capacity || 60}
                              id={`room-cap-${r.id}`}
                              className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200"
                            />
                          ) : (
                            <span className="font-semibold text-emerald-400">{r.capacity || 60} Students</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Floor: {r.floor || 1}</span>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => {
                                const name = (document.getElementById(`room-name-${r.id}`) as HTMLInputElement)?.value;
                                const cap = parseInt((document.getElementById(`room-cap-${r.id}`) as HTMLInputElement)?.value || '60', 10);
                                handleSaveRoom(r.id, { name, capacity: cap });
                              }}
                              className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg border border-emerald-500/30"
                              title="Save"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingRoomId(null)}
                              className="p-1.5 bg-slate-800 text-slate-400 hover:bg-slate-700 rounded-lg"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingRoomId(r.id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg"
                              title="Edit Room"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(r.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                              title="Delete Room"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STUDENT COHORTS & YEARS                                            */}
      {/* ========================================================================= */}
      {activeTab === 'cohorts' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur">
            <div>
              <h2 className="text-base font-bold text-slate-200">University Cohorts (Years 1 to 4)</h2>
              <p className="text-xs text-slate-400">Manage Sections, student numbers, and semester groups for all academic years.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddBatchModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium border border-slate-700 transition"
              >
                <Layers className="w-4 h-4" />
                <span>Add Year Batch</span>
              </button>
              <button
                onClick={() => setShowAddSectionModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Section</span>
              </button>
            </div>
          </div>

          {/* Year Tabs */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map(yr => (
              <button
                key={yr}
                onClick={() => setSelectedYearTab(yr)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  selectedYearTab === yr
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Year {yr} ({yr === 1 ? '1st Year' : yr === 2 ? '2nd Year' : yr === 3 ? '3rd Year' : '4th Year / Final'})
              </button>
            ))}
          </div>

          {/* Hierarchy Cards for Selected Year */}
          {(() => {
            const currentYearData = Array.isArray(hierarchy) ? hierarchy.find(h => h.year === selectedYearTab) : null;
            const departments = currentYearData?.departments || [];

            if (departments.length === 0) {
              return (
                <div className="py-16 text-center text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800">
                  <GraduationCap className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  <p className="font-semibold text-slate-400">No sections found for Year {selectedYearTab}</p>
                  <p className="text-xs text-slate-500 mt-1">Use the "Add Section" or "Add Year Batch" button above to register cohorts for this year.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {departments.map(dept => (
                  <div key={dept.deptId} className="bg-slate-900/50 rounded-2xl border border-slate-800 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <BookOpen className="w-4 h-4 text-indigo-400" />
                        <h3 className="font-bold text-slate-200 text-sm">{dept.deptName}</h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-indigo-400">
                        {dept.sections.length} Sections
                      </span>
                    </div>

                    <div className="space-y-2">
                      {dept.sections.map(sec => {
                        const isEditing = editingSectionId === sec.id;
                        return (
                          <div
                            key={sec.id}
                            className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/20">
                                {sec.name.split('-').pop() || sec.name}
                              </div>
                              <div>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    defaultValue={sec.name}
                                    id={`sec-name-${sec.id}`}
                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-100 font-semibold"
                                  />
                                ) : (
                                  <span className="font-semibold text-slate-200 text-sm">{sec.name}</span>
                                )}
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                  <Users className="w-3 h-3" />
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      defaultValue={sec.studentCount || 60}
                                      id={`sec-count-${sec.id}`}
                                      className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-200"
                                    />
                                  ) : (
                                    <span>{sec.studentCount || 60} Students</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => {
                                      const name = (document.getElementById(`sec-name-${sec.id}`) as HTMLInputElement)?.value;
                                      const studentCount = parseInt((document.getElementById(`sec-count-${sec.id}`) as HTMLInputElement)?.value || '60', 10);
                                      handleSaveSection(sec.id, { name, studentCount });
                                    }}
                                    className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg border border-emerald-500/30"
                                    title="Save"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingSectionId(null)}
                                    className="p-1.5 bg-slate-800 text-slate-400 hover:bg-slate-700 rounded-lg"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setEditingSectionId(sec.id)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition"
                                    title="Edit Section"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSection(sec.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                    title="Delete Section"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD TIME PERIOD                                                    */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL: ADD TIME PERIOD                                                    */}
      {/* ========================================================================= */}
      {showAddSlotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-lg text-slate-100">Add Time Period</h3>
              </div>
              <button onClick={() => setShowAddSlotModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSlot} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Applicable Academic Year</label>
                <select
                  value={slotFormData.yearNumber}
                  onChange={e => setSlotFormData({ ...slotFormData, yearNumber: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                >
                  <option value={0}>All Years (General Default Schedule)</option>
                  <option value={1}>Year 1 (B.Tech Year 1)</option>
                  <option value={2}>Year 2 (B.Tech Year 2)</option>
                  <option value={3}>Year 3 (B.Tech Year 3)</option>
                  <option value={4}>Year 4 (B.Tech Year 4)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Day of Week</label>
                <select
                  value={slotFormData.day}
                  onChange={e => setSlotFormData({ ...slotFormData, day: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                >
                  {daysOfWeek.map((dayName, idx) => (
                    <option key={idx} value={idx}>{dayName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={slotFormData.startTime}
                    onChange={e => setSlotFormData({ ...slotFormData, startTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={slotFormData.endTime}
                    onChange={e => setSlotFormData({ ...slotFormData, endTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Optional Label</label>
                <input
                  type="text"
                  placeholder="e.g. Period 1, Afternoon Lab, Lunch Break"
                  value={slotFormData.label}
                  onChange={e => setSlotFormData({ ...slotFormData, label: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isBreakSlot"
                  checked={slotFormData.isBreak}
                  onChange={e => setSlotFormData({ ...slotFormData, isBreak: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isBreakSlot" className="text-xs text-slate-300">Is this a break / interval period?</label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSlotModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20"
                >
                  Create Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COPY YEAR SCHEDULE                                                 */}
      {/* ========================================================================= */}
      {showCopyYearModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-lg text-slate-100">Copy Period Timings Between Years</h3>
              </div>
              <button onClick={() => setShowCopyYearModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCopyYear} className="space-y-4 text-sm">
              <p className="text-xs text-slate-400">
                Duplicate all time slots & period boundaries from one year to another so you don't have to enter them manually for each year.
              </p>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Source Schedule</label>
                <select
                  value={copyYearData.sourceYear}
                  onChange={e => setCopyYearData({ ...copyYearData, sourceYear: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                >
                  <option value={0}>All Years (General Default)</option>
                  <option value={1}>Year 1 Schedule</option>
                  <option value={2}>Year 2 Schedule</option>
                  <option value={3}>Year 3 Schedule</option>
                  <option value={4}>Year 4 Schedule</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Target Academic Year</label>
                <select
                  value={copyYearData.targetYear}
                  onChange={e => setCopyYearData({ ...copyYearData, targetYear: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                >
                  <option value={1}>Year 1 (B.Tech Year 1)</option>
                  <option value={2}>Year 2 (B.Tech Year 2)</option>
                  <option value={3}>Year 3 (B.Tech Year 3)</option>
                  <option value={4}>Year 4 (B.Tech Year 4)</option>
                  <option value={0}>All Years (General Default)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCopyYearModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-600/20"
                >
                  {loading ? 'Copying...' : 'Copy Timings Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SYNC TO ALL 6 DAYS                                                 */}
      {/* ========================================================================= */}
      {showApplyAllDaysModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-lg text-slate-100">Sync Day's Timings to All 6 Days</h3>
              </div>
              <button onClick={() => setShowApplyAllDaysModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyAllDays} className="space-y-4 text-sm">
              <p className="text-xs text-slate-400">
                Take the periods and intervals of one day and mirror them across Monday, Tuesday, Wednesday, Thursday, Friday, and Saturday.
              </p>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Target Academic Year</label>
                <select
                  value={applyDaysData.year}
                  onChange={e => setApplyDaysData({ ...applyDaysData, year: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                >
                  <option value={0}>All Years (General Default)</option>
                  <option value={1}>Year 1</option>
                  <option value={2}>Year 2</option>
                  <option value={3}>Year 3</option>
                  <option value={4}>Year 4</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Source Template Day</label>
                <select
                  value={applyDaysData.sourceDay}
                  onChange={e => setApplyDaysData({ ...applyDaysData, sourceDay: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                >
                  {daysOfWeek.map((dayName, idx) => (
                    <option key={idx} value={idx}>{dayName}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowApplyAllDaysModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20"
                >
                  {loading ? 'Syncing...' : 'Sync to All 6 Days'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD VENUE / ROOM                                                   */}
      {/* ========================================================================= */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-lg text-slate-100">Add Venue / Room</h3>
              </div>
              <button onClick={() => setShowAddRoomModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1">Room Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lab 4, LH-201"
                    value={roomFormData.name}
                    onChange={e => setRoomFormData({ ...roomFormData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1">Room Code</label>
                  <input
                    type="text"
                    placeholder="e.g. L4, 201"
                    value={roomFormData.code}
                    onChange={e => setRoomFormData({ ...roomFormData, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Building</label>
                <select
                  value={roomFormData.buildingId}
                  onChange={e => setRoomFormData({ ...roomFormData, buildingId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                >
                  {buildings.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1">Room Type</label>
                  <select
                    value={roomFormData.type}
                    onChange={e => setRoomFormData({ ...roomFormData, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  >
                    <option value="CLASSROOM">Classroom / Lecture</option>
                    <option value="LAB">Computer / Science Lab</option>
                    <option value="SEMINAR">Seminar Hall</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1">Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={roomFormData.capacity}
                    onChange={e => setRoomFormData({ ...roomFormData, capacity: parseInt(e.target.value, 10) || 60 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20"
                >
                  Add Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD BUILDING                                                       */}
      {/* ========================================================================= */}
      {showAddBuildingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-lg text-slate-100">Add Building / Block</h3>
              </div>
              <button onClick={() => setShowAddBuildingModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBuilding} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Building Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Block, Engineering Complex"
                  value={newBuildingData.name}
                  onChange={e => setNewBuildingData({ ...newBuildingData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Building Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SB, ENG, MB"
                  value={newBuildingData.code}
                  onChange={e => setNewBuildingData({ ...newBuildingData, code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddBuildingModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20"
                >
                  Add Building
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD SECTION                                                        */}
      {/* ========================================================================= */}
      {showAddSectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-lg text-slate-100">Add Academic Section</h3>
              </div>
              <button onClick={() => setShowAddSectionModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSection} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Section Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSE-A, AI&DS-B, CYS-A, AI&ML-C"
                  value={sectionFormData.name}
                  onChange={e => setSectionFormData({ ...sectionFormData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Semester</label>
                <select
                  required
                  value={sectionFormData.semesterId}
                  onChange={e => setSectionFormData({ ...sectionFormData, semesterId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                >
                  <option value="">Select Semester...</option>
                  {cohortsData?.semesters?.map((sem: any) => (
                    <option key={sem.id} value={sem.id}>
                      {sem.name} (Year {sem.yearNumber || sem.batchYear || 1})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Student Capacity / Count</label>
                <input
                  type="number"
                  min="1"
                  value={sectionFormData.studentCount}
                  onChange={e => setSectionFormData({ ...sectionFormData, studentCount: parseInt(e.target.value, 10) || 60 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddSectionModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20"
                >
                  Create Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD BATCH                                                          */}
      {/* ========================================================================= */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-lg text-slate-100">Add Academic Batch</h3>
              </div>
              <button onClick={() => setShowAddBatchModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBatch} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Batch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Batch 2024-2028"
                  value={newBatchData.name}
                  onChange={e => setNewBatchData({ ...newBatchData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-semibold mb-1">Academic Year Number (1 - 4)</label>
                <select
                  value={newBatchData.year}
                  onChange={e => setNewBatchData({ ...newBatchData, year: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                >
                  <option value={1}>Year 1 (1st Year)</option>
                  <option value={2}>Year 2 (2nd Year)</option>
                  <option value={3}>Year 3 (3rd Year)</option>
                  <option value={4}>Year 4 (Final Year)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1">Start Year</label>
                  <input
                    type="number"
                    value={newBatchData.startYear}
                    onChange={e => setNewBatchData({ ...newBatchData, startYear: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold mb-1">End Year</label>
                  <input
                    type="number"
                    value={newBatchData.endYear}
                    onChange={e => setNewBatchData({ ...newBatchData, endYear: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20"
                >
                  Add Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
