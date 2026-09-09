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
  Layers,
  Users,
  Calendar,
  Sparkles,
  Shield,
  Trash
} from 'lucide-react';
import { api } from '../api';

type TabType = 'periods' | 'venues' | 'cohorts' | 'cleanup';

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

  // Cleanup tab state
  const [cleanScope, setCleanScope] = useState<'TIMETABLE_ENTRIES_ONLY' | 'ALL_TIMETABLES_AND_SESSIONS' | 'CLEAR_CURRICULUM_AND_ACTIVITIES' | 'FULL_FACTORY_RESET'>('TIMETABLE_ENTRIES_ONLY');
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanConfirmAccepted, setCleanConfirmAccepted] = useState(false);
  const [cleanupFeedback, setCleanupFeedback] = useState<{ success: boolean; text: string } | null>(null);

  // Time Slots state (with Year-Specific Periods Support)
  const [slots, setSlots] = useState<TimeSlotItem[]>([]);
  const [selectedPeriodYear, setSelectedPeriodYear] = useState<number>(1);
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'MATRIX'>(0);
  const [slotSearch, setSlotSearch] = useState('');
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotFormData, setSlotFormData] = useState({
    day: 0,
    startTime: '09:00',
    endTime: '09:50',
    label: '',
    isBreak: false,
    yearNumber: 1
  });
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [showCopyYearModal, setShowCopyYearModal] = useState(false);
  const [copyYearData, setCopyYearData] = useState({ sourceYear: 1, targetYear: 2 });
  const [showApplyAllDaysModal, setShowApplyAllDaysModal] = useState(false);
  const [applyDaysData, setApplyDaysData] = useState({ year: 1, sourceDay: 0 });

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
  const loadSlots = useCallback(async (yearOverride?: number) => {
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

  const handlePopulateDefault = async (yearNum?: number) => {
    const yr = yearNum || selectedPeriodYear;
    try {
      setLoading(true);
      const res = await api.populateDefaultSlots(yr);
      showToast(res.message || `Standard 8-period schedule populated for Year ${yr}`);
      loadSlots(yr);
    } catch (err: any) {
      showToast(err.message || 'Failed to populate default periods', true);
    } finally {
      setLoading(false);
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
      setSlotFormData({ day: 0, startTime: '09:00', endTime: '09:50', label: '', isBreak: false, yearNumber: selectedPeriodYear });
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

  const handleExecuteCleanup = async (customScope?: any) => {
    const scopeToUse = customScope || cleanScope;
    setIsCleaning(true);
    setCleanupFeedback(null);
    try {
      const res = await api.cleanData(scopeToUse);
      if (res.success) {
        showToast(res.message || 'System data cleaned successfully!');
        setCleanupFeedback({ success: true, text: res.message || 'Data cleaned successfully!' });
        setCleanConfirmAccepted(false);
        loadSlots();
        loadVenues();
        loadCohorts();
      } else {
        showToast(res.error || 'Cleanup operation failed', true);
        setCleanupFeedback({ success: false, text: res.error || 'Cleanup operation failed' });
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to clean data', true);
      setCleanupFeedback({ success: false, text: err.message || 'Failed to clean data' });
    } finally {
      setIsCleaning(false);
    }
  };

  // Filtered Slots (by selected year, day filter, and search term)
  const filteredSlots = slots.filter(s => {
    if (typeof selectedDayFilter === 'number' && s.day !== selectedDayFilter) return false;
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
    <div className="space-y-6">
      {/* Toast Notifications */}
      {successMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl backdrop-blur border border-emerald-400/40 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium text-sm">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-rose-600 text-white px-4 py-3 rounded-xl shadow-2xl backdrop-blur border border-rose-400/40 animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium text-sm">{errorMsg}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="lux-card p-6 bg-white border-[#D8E6ED] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-[#EBF4F7] text-[#002E4E] border border-[#D8E6ED] flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-[#2582A1]" />
                Institutional Admin Control Panel
              </span>
              <span className="text-xs text-[#4A6375]">• Super Admin Access</span>
            </div>
            <h1 className="text-2xl font-bold text-[#002E4E] tracking-tight">
              Academic Settings & Infrastructure
            </h1>
            <p className="text-xs text-[#4A6375] max-w-2xl leading-relaxed">
              Configure time period slots, class venues, room capacities, student cohort years & sections, and system reset operations.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (activeTab === 'periods') loadSlots();
                if (activeTab === 'venues') loadVenues();
                if (activeTab === 'cohorts') loadCohorts();
              }}
              title="Refresh Data"
              className="p-2.5 rounded-xl border border-[#D8E6ED] bg-[#F4F8FA] text-[#002E4E] hover:bg-[#EBF4F7] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#2582A1]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#D8E6ED] overflow-x-auto">
          <button
            onClick={() => setActiveTab('periods')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'periods'
                ? 'bg-[#E8F4F8] text-[#2582A1] border border-[#2582A1]'
                : 'text-[#4A6375] hover:text-[#002E4E] hover:bg-[#F4F8FA]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Time Periods & Schedules</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white border border-[#D8E6ED] text-[#4A6375] font-semibold">{slots.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('venues')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'venues'
                ? 'bg-[#E8F4F8] text-[#2582A1] border border-[#2582A1]'
                : 'text-[#4A6375] hover:text-[#002E4E] hover:bg-[#F4F8FA]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Venues & Classrooms</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white border border-[#D8E6ED] text-[#4A6375] font-semibold">{rooms.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('cohorts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'cohorts'
                ? 'bg-[#E8F4F8] text-[#2582A1] border border-[#2582A1]'
                : 'text-[#4A6375] hover:text-[#002E4E] hover:bg-[#F4F8FA]'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Years, Batches & Sections</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white border border-[#D8E6ED] text-[#4A6375] font-semibold">4 Years</span>
          </button>

          <button
            onClick={() => setActiveTab('cleanup')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'cleanup'
                ? 'bg-rose-50 text-rose-700 border border-rose-300'
                : 'text-[#4A6375] hover:text-rose-600 hover:bg-rose-50/50'
            }`}
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Data Cleanup & Reset</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold border border-rose-200">Clean</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TIME PERIODS & SLOTS (TABULAR FORMAT WITH DAY TABS & MATRIX)     */}
      {/* ========================================================================= */}
      {activeTab === 'periods' && (
        <div className="space-y-6">
          {/* Year Selector Tabs Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#D8E6ED] shadow-xs">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <div className="flex items-center gap-1.5 pr-3 border-r border-[#D8E6ED] shrink-0">
                <GraduationCap className="w-4 h-4 text-[#2582A1]" />
                <span className="text-xs font-bold text-[#002E4E]">Academic Year:</span>
              </div>
              {[
                { year: 1, label: '1st Year', sub: 'B.Tech Y1' },
                { year: 2, label: '2nd Year', sub: 'B.Tech Y2' },
                { year: 3, label: '3rd Year', sub: 'B.Tech Y3' },
                { year: 4, label: '4th Year', sub: 'B.Tech Y4' },
              ].map(y => {
                const isSelected = selectedPeriodYear === y.year;
                const slotCount = slots.filter(s => s.yearNumber === y.year).length;
                return (
                  <button
                    key={y.year}
                    onClick={() => {
                      setSelectedPeriodYear(y.year);
                      loadSlots(y.year);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                      isSelected
                        ? 'bg-[#2582A1] text-white shadow-sm ring-2 ring-[#2582A1]/20'
                        : 'bg-[#F4F8FA] text-[#4A6375] hover:text-[#002E4E] hover:bg-[#E8F4F8] border border-[#D8E6ED]'
                    }`}
                  >
                    <span>{y.label}</span>
                    <span className="text-[10px] opacity-80 font-normal">({y.sub})</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isSelected ? 'bg-[#1C6982] text-white' : 'bg-white text-[#4A6375] border border-[#D8E6ED]'
                    }`}>
                      {slotCount} slots
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Top Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handlePopulateDefault(selectedPeriodYear)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 transition"
                title="Populate standard 8 periods + morning & lunch breaks"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Populate Standard 8 Periods</span>
              </button>
              <button
                onClick={() => {
                  setCopyYearData({ sourceYear: selectedPeriodYear, targetYear: selectedPeriodYear === 1 ? 2 : 1 });
                  setShowCopyYearModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#F4F8FA] hover:bg-[#E8F4F8] text-[#002E4E] rounded-xl text-xs font-bold border border-[#D8E6ED] transition"
                title="Duplicate timings to another year"
              >
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>Copy Year Schedule</span>
              </button>
            </div>
          </div>

          {/* DAY SELECTION TABS & VIEW SWITCHER (Tabular Structure) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#D8E6ED] shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-[#002E4E] pr-2 shrink-0">Schedule Day:</span>
              {daysOfWeek.map((d, idx) => {
                const daySlots = slots.filter(s => s.yearNumber === selectedPeriodYear && s.day === idx);
                const isSelected = selectedDayFilter === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDayFilter(idx)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#002E4E] text-white shadow-xs'
                        : 'bg-[#F4F8FA] text-[#4A6375] hover:bg-[#E8F4F8] hover:text-[#002E4E] border border-[#D8E6ED]'
                    }`}
                  >
                    <span>{d}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-[#2582A1] text-white' : 'bg-white text-[#4A6375] border border-[#D8E6ED]'
                    }`}>
                      {daySlots.length}
                    </span>
                  </button>
                );
              })}

              <button
                onClick={() => setSelectedDayFilter('MATRIX')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ml-1 ${
                  selectedDayFilter === 'MATRIX'
                    ? 'bg-[#2582A1] text-white shadow-xs'
                    : 'bg-[#E8F4F8] text-[#2582A1] hover:bg-[#D4EAF2] border border-[#2582A1]/30'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Weekly Grid Matrix</span>
              </button>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {typeof selectedDayFilter === 'number' && (
                <button
                  onClick={() => {
                    setApplyDaysData({ year: selectedPeriodYear, sourceDay: selectedDayFilter });
                    setShowApplyAllDaysModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#E8F4F8] hover:bg-[#D4EAF2] text-[#002E4E] rounded-xl text-xs font-bold border border-[#2582A1]/30 transition"
                  title={`Copy ${daysOfWeek[selectedDayFilter]}'s timings across all 6 days`}
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#2582A1]" />
                  <span>Sync {daysOfWeek[selectedDayFilter]} to All Days</span>
                </button>
              )}

              <button
                onClick={() => {
                  setSlotFormData({
                    day: typeof selectedDayFilter === 'number' ? selectedDayFilter : 0,
                    startTime: '09:00',
                    endTime: '09:50',
                    label: '',
                    isBreak: false,
                    yearNumber: selectedPeriodYear
                  });
                  setShowAddSlotModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-xs transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Period</span>
              </button>
            </div>
          </div>

          {/* VIEW 1: DAILY TABULAR SCHEDULE TABLE (Clean, structured list for the chosen day) */}
          {typeof selectedDayFilter === 'number' && (() => {
            const currentDaySlots = slots
              .filter(s => s.yearNumber === selectedPeriodYear && s.day === selectedDayFilter)
              .sort((a, b) => a.periodIndex - b.periodIndex);

            return (
              <div className="bg-white rounded-2xl border border-[#D8E6ED] overflow-hidden shadow-xs">
                {/* Table Header Banner */}
                <div className="p-4 bg-[#F8FBFC] border-b border-[#D8E6ED] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-[#002E4E] text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#2582A1]" />
                      <span>{daysOfWeek[selectedDayFilter]} Period Timings — Year {selectedPeriodYear}</span>
                    </h3>
                    <p className="text-xs text-[#4A6375] mt-0.5">
                      Configure class durations, break intervals, and lunch timings. Click any value to edit directly.
                    </p>
                  </div>

                  <span className="text-xs font-bold text-[#002E4E] bg-white px-3 py-1 rounded-lg border border-[#D8E6ED] self-start sm:self-auto">
                    {currentDaySlots.length} Configured Periods
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F4F8FA] text-[#4A6375] uppercase text-[11px] font-bold tracking-wider border-b border-[#D8E6ED]">
                      <tr>
                        <th className="px-5 py-3.5 w-16 text-center">Period</th>
                        <th className="px-5 py-3.5">Period Name / Label</th>
                        <th className="px-5 py-3.5">Start Time</th>
                        <th className="px-5 py-3.5">End Time</th>
                        <th className="px-5 py-3.5 text-center">Duration</th>
                        <th className="px-5 py-3.5">Period Type / Status</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D8E6ED]">
                      {currentDaySlots.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-16 text-center">
                            <div className="max-w-md mx-auto space-y-3">
                              <Clock className="w-8 h-8 text-[#2582A1] mx-auto opacity-50" />
                              <h4 className="font-bold text-sm text-[#002E4E]">
                                No Periods Configured on {daysOfWeek[selectedDayFilter]} for Year {selectedPeriodYear}
                              </h4>
                              <p className="text-xs text-[#4A6375]">
                                Click below to populate standard 8 periods or add a custom period slot.
                              </p>
                              <div className="flex items-center justify-center gap-2 pt-2">
                                <button
                                  onClick={() => handlePopulateDefault(selectedPeriodYear)}
                                  className="px-3.5 py-1.5 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-xs transition"
                                >
                                  ⚡ Populate Standard 8 Periods
                                </button>
                                <button
                                  onClick={() => {
                                    setSlotFormData({
                                      day: selectedDayFilter,
                                      startTime: '09:00',
                                      endTime: '09:50',
                                      label: 'Period 1',
                                      isBreak: false,
                                      yearNumber: selectedPeriodYear
                                    });
                                    setShowAddSlotModal(true);
                                  }}
                                  className="px-3.5 py-1.5 bg-[#F4F8FA] hover:bg-[#E8F4F8] text-[#002E4E] border border-[#D8E6ED] rounded-xl text-xs font-bold transition"
                                >
                                  + Add Period
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        currentDaySlots.map((s) => {
                          const isEditing = editingSlotId === s.id;
                          const isLunch = s.label?.toLowerCase().includes('lunch');
                          return (
                            <tr key={s.id} className="hover:bg-[#F8FBFC] transition">
                              {/* Period Index */}
                              <td className="px-5 py-3.5 text-center">
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-[#E8F4F8] text-[#2582A1] border border-[#C4E2EC]">
                                  P{s.periodIndex + 1}
                                </span>
                              </td>

                              {/* Label */}
                              <td className="px-5 py-3.5">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    defaultValue={s.label || ''}
                                    id={`slot-label-${s.id}`}
                                    placeholder="e.g. Period 1, Tea Break, Lunch Break"
                                    className="bg-white border border-[#2582A1] rounded-lg px-2.5 py-1 text-xs font-bold text-[#002E4E] focus:outline-none w-full max-w-[200px]"
                                  />
                                ) : (
                                  <span className="font-bold text-[#002E4E] text-xs">
                                    {s.label || `Period ${s.periodIndex + 1}`}
                                  </span>
                                )}
                              </td>

                              {/* Start Time */}
                              <td className="px-5 py-3.5">
                                {isEditing ? (
                                  <input
                                    type="time"
                                    defaultValue={s.startTime}
                                    id={`slot-start-${s.id}`}
                                    className="bg-white border border-[#2582A1] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#002E4E] focus:outline-none"
                                  />
                                ) : (
                                  <span className="font-mono text-[#002E4E] font-bold text-xs bg-[#F4F8FA] px-2 py-1 rounded-md border border-[#D8E6ED]">
                                    {s.startTime}
                                  </span>
                                )}
                              </td>

                              {/* End Time */}
                              <td className="px-5 py-3.5">
                                {isEditing ? (
                                  <input
                                    type="time"
                                    defaultValue={s.endTime}
                                    id={`slot-end-${s.id}`}
                                    className="bg-white border border-[#2582A1] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#002E4E] focus:outline-none"
                                  />
                                ) : (
                                  <span className="font-mono text-[#002E4E] font-bold text-xs bg-[#F4F8FA] px-2 py-1 rounded-md border border-[#D8E6ED]">
                                    {s.endTime}
                                  </span>
                                )}
                              </td>

                              {/* Duration calculation */}
                              <td className="px-5 py-3.5 text-center text-xs text-[#4A6375] font-medium font-mono">
                                {(() => {
                                  try {
                                    const [sh, sm] = (s.startTime || '09:00').split(':').map(Number);
                                    const [eh, em] = (s.endTime || '09:50').split(':').map(Number);
                                    const mins = (eh * 60 + em) - (sh * 60 + sm);
                                    return mins > 0 ? `${mins} min` : '50 min';
                                  } catch {
                                    return '50 min';
                                  }
                                })()}
                              </td>

                              {/* Type / Break Status */}
                              <td className="px-5 py-3.5">
                                {isEditing ? (
                                  <label className="flex items-center gap-1.5 text-xs text-[#002E4E] font-bold cursor-pointer">
                                    <input
                                      type="checkbox"
                                      id={`slot-break-${s.id}`}
                                      defaultChecked={s.isBreak}
                                      className="rounded bg-white border-[#D8E6ED] text-[#2582A1] w-4 h-4 cursor-pointer"
                                    />
                                    <span>Is Break / Lunch</span>
                                  </label>
                                ) : (
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                                    s.isBreak
                                      ? isLunch
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}>
                                    <span className={`w-2 h-2 rounded-full ${s.isBreak ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                    {s.isBreak ? (isLunch ? 'Lunch Break' : (s.label || 'Break / Recess')) : 'Academic Class'}
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-5 py-3.5 text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        const start = (document.getElementById(`slot-start-${s.id}`) as HTMLInputElement)?.value;
                                        const end = (document.getElementById(`slot-end-${s.id}`) as HTMLInputElement)?.value;
                                        const label = (document.getElementById(`slot-label-${s.id}`) as HTMLInputElement)?.value;
                                        const isBreak = (document.getElementById(`slot-break-${s.id}`) as HTMLInputElement)?.checked;
                                        handleSaveSlot(s.id, { startTime: start, endTime: end, label, isBreak, yearNumber: selectedPeriodYear });
                                      }}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                                      title="Save Changes"
                                    >
                                      <Save className="w-3.5 h-3.5" />
                                      <span>Save</span>
                                    </button>
                                    <button
                                      onClick={() => setEditingSlotId(null)}
                                      className="px-2.5 py-1.5 bg-[#F4F8FA] text-[#4A6375] hover:bg-[#E8F4F8] rounded-lg text-xs font-medium transition"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => setEditingSlotId(s.id)}
                                      className="p-1.5 text-[#4A6375] hover:text-[#2582A1] hover:bg-[#E8F4F8] rounded-lg transition"
                                      title="Edit Timing"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSlot(s.id)}
                                      className="p-1.5 text-[#4A6375] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
            );
          })()}

          {/* VIEW 2: WEEKLY FULL MATRIX GRID (Days x Periods 2D Table) */}
          {selectedDayFilter === 'MATRIX' && (
            <div className="bg-white rounded-2xl border border-[#D8E6ED] overflow-hidden shadow-xs">
              <div className="p-4 bg-[#F8FBFC] border-b border-[#D8E6ED] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#002E4E] text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#2582A1]" />
                    <span>Weekly 6-Day Timetable Matrix — Year {selectedPeriodYear}</span>
                  </h3>
                  <p className="text-xs text-[#4A6375] mt-0.5">
                    Complete overview of Monday to Saturday period bounds and break timings.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-center text-xs">
                  <thead>
                    <tr className="bg-[#002E4E] text-white font-bold">
                      <th className="px-4 py-3 border-r border-[#1C5C7A] text-left w-24">Day</th>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                        <th key={p} className="px-3 py-3 border-r border-[#1C5C7A] text-[11px] min-w-[110px]">
                          Period {p + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8E6ED]">
                    {daysOfWeek.map((dayName, dIdx) => {
                      const daySlots = slots
                        .filter(s => s.yearNumber === selectedPeriodYear && s.day === dIdx)
                        .sort((a, b) => a.periodIndex - b.periodIndex);

                      return (
                        <tr key={dIdx} className="hover:bg-[#F8FBFC] transition">
                          <td className="px-4 py-3 font-bold text-[#002E4E] text-left bg-[#F4F8FA] border-r border-[#D8E6ED]">
                            {dayName}
                          </td>
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(pIdx => {
                            const slot = daySlots.find(s => s.periodIndex === pIdx);
                            if (!slot) {
                              return (
                                <td key={pIdx} className="px-2 py-3 text-center text-[#829BA8] border-r border-[#D8E6ED] text-[10px]">
                                  -
                                </td>
                              );
                            }
                            const isLunch = slot.label?.toLowerCase().includes('lunch');
                            return (
                              <td key={pIdx} className="px-2 py-2 border-r border-[#D8E6ED]">
                                <div className={`p-1.5 rounded-lg border text-left space-y-0.5 ${
                                  slot.isBreak
                                    ? isLunch
                                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                                      : 'bg-amber-50/60 border-amber-200 text-amber-800'
                                    : 'bg-[#E8F4F8]/60 border-[#C4E2EC] text-[#002E4E]'
                                }`}>
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-[10px]">{slot.startTime} - {slot.endTime}</span>
                                    <button
                                      onClick={() => {
                                        setSelectedDayFilter(dIdx);
                                        setEditingSlotId(slot.id);
                                      }}
                                      className="text-[#4A6375] hover:text-[#2582A1]"
                                      title="Edit Timing"
                                    >
                                      <Edit2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                  <div className="text-[10px] truncate font-medium">
                                    {slot.label || (slot.isBreak ? 'Break' : `Period ${pIdx + 1}`)}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      /* TAB 2: VENUES & CLASSROOMS (TABULAR LIST FORMAT)                          */
      /* ========================================================================= */
      {activeTab === 'venues' && (
        <div className="space-y-6">
          {/* Top Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#D8E6ED] shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A6375]" />
                <input
                  type="text"
                  value={roomSearch}
                  onChange={e => setRoomSearch(e.target.value)}
                  placeholder="Search rooms by name, code, or building..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-[#D8E6ED] rounded-xl text-sm text-[#002E4E] placeholder-[#829BA8] focus:outline-none focus:border-[#2582A1]"
                />
              </div>

              <select
                value={selectedBuildingFilter}
                onChange={e => setSelectedBuildingFilter(e.target.value)}
                className="bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-sm font-bold text-[#002E4E] focus:outline-none focus:border-[#2582A1]"
              >
                <option value="all">All Buildings ({rooms.length} rooms)</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddBuildingModal(true)}
                className="px-3.5 py-2 bg-[#F4F8FA] hover:bg-[#E8F4F8] text-[#002E4E] border border-[#D8E6ED] rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Building2 className="w-4 h-4 text-[#2582A1]" />
                <span>Add Building</span>
              </button>
              <button
                onClick={() => setShowAddRoomModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Classroom / Lab</span>
              </button>
            </div>
          </div>

          {/* Venues & Classrooms Table */}
          <div className="bg-white rounded-2xl border border-[#D8E6ED] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F4F8FA] text-[#4A6375] uppercase text-[11px] font-bold tracking-wider border-b border-[#D8E6ED]">
                  <tr>
                    <th className="px-5 py-3.5 w-12 text-center">#</th>
                    <th className="px-5 py-3.5">Room Name</th>
                    <th className="px-5 py-3.5">Room Code</th>
                    <th className="px-5 py-3.5">Building / Block</th>
                    <th className="px-5 py-3.5">Room Type</th>
                    <th className="px-5 py-3.5 text-center">Seating Capacity</th>
                    <th className="px-5 py-3.5 text-center">Floor</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8E6ED]">
                  {filteredRooms.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-[#4A6375]">
                        <div className="max-w-md mx-auto space-y-3">
                          <Building2 className="w-8 h-8 text-[#2582A1] mx-auto opacity-50" />
                          <h3 className="font-bold text-sm text-[#002E4E]">No Classrooms or Venues Found</h3>
                          <p className="text-xs text-[#4A6375]">
                            {loading ? 'Loading rooms...' : 'Click "Add Classroom / Lab" above to configure your university teaching venues.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRooms.map((r, idx) => {
                      const isEditing = editingRoomId === r.id;
                      return (
                        <tr key={r.id} className="hover:bg-[#F8FBFC] transition">
                          <td className="px-5 py-3.5 text-center text-xs text-[#4A6375] font-bold font-mono">
                            {idx + 1}
                          </td>
                          <td className="px-5 py-3.5">
                            {isEditing ? (
                              <input
                                type="text"
                                defaultValue={r.name}
                                id={`room-name-${r.id}`}
                                className="bg-white border border-[#2582A1] rounded-lg px-2.5 py-1 text-xs font-bold text-[#002E4E] focus:outline-none"
                              />
                            ) : (
                              <span className="font-bold text-[#002E4E] text-xs">{r.name}</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            {isEditing ? (
                              <input
                                type="text"
                                defaultValue={r.code}
                                id={`room-code-${r.id}`}
                                className="bg-white border border-[#2582A1] rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-[#2582A1] focus:outline-none"
                              />
                            ) : (
                              <span className="font-mono text-xs font-bold text-[#2582A1] bg-[#E8F4F8] px-2 py-0.5 rounded border border-[#D8E6ED]">
                                {r.code}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs text-[#002E4E] flex items-center gap-1.5 font-medium">
                              <Building2 className="w-3.5 h-3.5 text-[#2582A1]" />
                              {r.buildingName || 'Apollo Tower'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center ${
                              r.type === 'COMPUTER_LAB'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : r.type === 'LECTURE_HALL'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {r.type?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                defaultValue={r.capacity}
                                id={`room-cap-${r.id}`}
                                className="w-16 bg-white border border-[#2582A1] rounded-lg px-2 py-1 text-xs text-center font-bold text-[#002E4E] focus:outline-none"
                              />
                            ) : (
                              <span className="font-bold text-xs text-[#002E4E] bg-[#F4F8FA] px-2.5 py-1 rounded-lg border border-[#D8E6ED]">
                                {r.capacity} Seats
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center text-xs font-bold text-[#4A6375]">
                            {r.floor || 1}F
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    const name = (document.getElementById(`room-name-${r.id}`) as HTMLInputElement)?.value;
                                    const code = (document.getElementById(`room-code-${r.id}`) as HTMLInputElement)?.value;
                                    const cap = parseInt((document.getElementById(`room-cap-${r.id}`) as HTMLInputElement)?.value, 10);
                                    handleSaveRoom(r.id, { name, code, capacity: cap });
                                  }}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                                  title="Save Changes"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Save</span>
                                </button>
                                <button
                                  onClick={() => setEditingRoomId(null)}
                                  className="px-2.5 py-1.5 bg-[#F4F8FA] text-[#4A6375] hover:bg-[#E8F4F8] rounded-lg text-xs font-medium transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setEditingRoomId(r.id)}
                                  className="p-1.5 text-[#4A6375] hover:text-[#2582A1] hover:bg-[#E8F4F8] rounded-lg transition"
                                  title="Edit Venue"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRoom(r.id)}
                                  className="p-1.5 text-[#4A6375] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Delete Venue"
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
      {/* TAB 3: YEARS, BATCHES & SECTIONS (TABULAR LIST FORMAT)                     */}
      {/* ========================================================================= */}
      {activeTab === 'cohorts' && (
        <div className="space-y-6">
          {/* Top Controls Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#D8E6ED] shadow-xs">
            {/* Year Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <div className="flex items-center gap-1.5 pr-2 border-r border-[#D8E6ED] shrink-0">
                <GraduationCap className="w-4 h-4 text-[#2582A1]" />
                <span className="text-xs font-bold text-[#002E4E]">Year Cohort:</span>
              </div>
              {[
                { year: 1, label: '1st Year', sub: 'B.Tech Y1' },
                { year: 2, label: '2nd Year', sub: 'B.Tech Y2' },
                { year: 3, label: '3rd Year', sub: 'B.Tech Y3' },
                { year: 4, label: '4th Year', sub: 'B.Tech Y4' }
              ].map(y => (
                <button
                  key={y.year}
                  onClick={() => setSelectedYearTab(y.year)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    selectedYearTab === y.year
                      ? 'bg-[#002E4E] text-white shadow-xs'
                      : 'bg-[#F4F8FA] text-[#4A6375] hover:text-[#002E4E] hover:bg-[#E8F4F8] border border-[#D8E6ED]'
                  }`}
                >
                  <span>{y.label}</span>
                  <span className="text-[10px] opacity-80">({y.sub})</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddBatchModal(true)}
                className="px-3.5 py-2 bg-[#F4F8FA] hover:bg-[#E8F4F8] text-[#002E4E] border border-[#D8E6ED] rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Layers className="w-4 h-4 text-[#2582A1]" />
                <span>Add Batch</span>
              </button>
              <button
                onClick={() => setShowAddSectionModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Section</span>
              </button>
            </div>
          </div>

          {/* Sections & Cohorts Table */}
          <div className="bg-white rounded-2xl border border-[#D8E6ED] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F4F8FA] text-[#4A6375] uppercase text-[11px] font-bold tracking-wider border-b border-[#D8E6ED]">
                  <tr>
                    <th className="px-5 py-3.5 w-12 text-center">#</th>
                    <th className="px-5 py-3.5">Academic Year</th>
                    <th className="px-5 py-3.5">Department / Branch</th>
                    <th className="px-5 py-3.5">Section Name</th>
                    <th className="px-5 py-3.5 text-center">Semester</th>
                    <th className="px-5 py-3.5 text-center">Student Strength</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8E6ED]">
                  {(() => {
                    const sectionsForYear = (cohortsData?.sections || []).filter((s: any) => {
                      if (!s.start_year) return true;
                      const calculatedYear = Math.max(1, Math.min(4, new Date().getFullYear() - s.start_year + 1));
                      return calculatedYear === selectedYearTab;
                    });

                    const displaySections: any[] = sectionsForYear.length > 0
                      ? sectionsForYear
                      : hierarchy
                          .filter(h => h.year === selectedYearTab)
                          .flatMap(h => h.departments.flatMap(d => (d.sections || []).map(sec => ({
                            ...sec,
                            dept_name: d.deptName,
                            year: h.year
                          }))));

                    if (displaySections.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="px-6 py-16 text-center text-[#4A6375]">
                            <div className="max-w-md mx-auto space-y-3">
                              <GraduationCap className="w-8 h-8 text-[#2582A1] mx-auto opacity-50" />
                              <h3 className="font-bold text-sm text-[#002E4E]">
                                No Sections Configured for Year {selectedYearTab}
                              </h3>
                              <p className="text-xs text-[#4A6375]">
                                Click "Add Section" above to register class cohorts and sections for this academic year.
                              </p>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return displaySections.map((sec, idx) => {
                      const isEditing = editingSectionId === sec.id;
                      return (
                        <tr key={sec.id} className="hover:bg-[#F8FBFC] transition">
                          <td className="px-5 py-3.5 text-center text-xs text-[#4A6375] font-bold font-mono">
                            {idx + 1}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#E8F4F8] text-[#2582A1] border border-[#C4E2EC]">
                              {selectedYearTab === 1 ? '1st Year' : selectedYearTab === 2 ? '2nd Year' : selectedYearTab === 3 ? '3rd Year' : '4th Year'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-[#002E4E] text-xs">
                              {sec.dept_name || sec.program_name || 'Computer Science & Engineering'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {isEditing ? (
                              <input
                                type="text"
                                defaultValue={sec.name}
                                id={`sec-name-${sec.id}`}
                                className="bg-white border border-[#2582A1] rounded-lg px-2.5 py-1 text-xs font-bold text-[#002E4E] focus:outline-none"
                              />
                            ) : (
                              <span className="font-bold text-[#002E4E] text-xs bg-[#F4F8FA] px-2.5 py-1 rounded-lg border border-[#D8E6ED]">
                                {sec.name}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="text-xs font-bold text-[#4A6375]">
                              {sec.semester_name || (sec.semester_number ? `Semester ${sec.semester_number}` : `Sem ${selectedYearTab * 2 - 1}`)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {isEditing ? (
                              <input
                                type="number"
                                defaultValue={sec.studentCount || sec.student_count || 60}
                                id={`sec-count-${sec.id}`}
                                className="w-16 bg-white border border-[#2582A1] rounded-lg px-2 py-1 text-xs text-center font-bold text-[#002E4E] focus:outline-none"
                              />
                            ) : (
                              <span className="font-bold text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                                <Users className="w-3 h-3 text-emerald-600" />
                                {sec.studentCount || sec.student_count || 60} Students
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    const name = (document.getElementById(`sec-name-${sec.id}`) as HTMLInputElement)?.value;
                                    const count = parseInt((document.getElementById(`sec-count-${sec.id}`) as HTMLInputElement)?.value, 10);
                                    handleSaveSection(sec.id, { name, studentCount: count });
                                  }}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                                  title="Save Changes"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Save</span>
                                </button>
                                <button
                                  onClick={() => setEditingSectionId(null)}
                                  className="px-2.5 py-1.5 bg-[#F4F8FA] text-[#4A6375] hover:bg-[#E8F4F8] rounded-lg text-xs font-medium transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setEditingSectionId(sec.id)}
                                  className="p-1.5 text-[#4A6375] hover:text-[#2582A1] hover:bg-[#E8F4F8] rounded-lg transition"
                                  title="Edit Section"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSection(sec.id)}
                                  className="p-1.5 text-[#4A6375] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Delete Section"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DATA CLEANUP & RESET (STRUCTURED TABLE FORMAT)                      */}
      {/* ========================================================================= */}
      {activeTab === 'cleanup' && (
        <div className="space-y-6">
          <div className="bg-rose-50/70 p-5 rounded-2xl border border-rose-200 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-rose-900">
                System Data Management & Cleanup Console
              </h2>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed">
              Selectively clear active timetables, purge multi-semester schedule entries, or perform a total factory reset in structured list format.
            </p>
          </div>

          {/* Cleanup Operations Table */}
          <div className="bg-white rounded-2xl border border-[#D8E6ED] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F4F8FA] text-[#4A6375] uppercase text-[11px] font-bold tracking-wider border-b border-[#D8E6ED]">
                  <tr>
                    <th className="px-5 py-3.5">Cleanup Operation / Scope</th>
                    <th className="px-5 py-3.5">Target Data Removed</th>
                    <th className="px-5 py-3.5">Preserved Entities</th>
                    <th className="px-5 py-3.5 text-center">Safety Level</th>
                    <th className="px-5 py-3.5 text-right">Execute Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8E6ED]">
                  {/* Row 1: Active Grid */}
                  <tr className="hover:bg-[#F8FBFC] transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">🧹</span>
                        <div>
                          <strong className="text-xs font-bold text-[#002E4E] block">Clear Active Timetable Grid Only</strong>
                          <span className="text-[11px] text-[#4A6375]">Removes scheduled slots for active draft</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-[#4A6375]">
                      Active timetable sessions, placements & conflict markers
                    </td>
                    <td className="px-5 py-4 text-xs text-emerald-700 font-medium">
                      ✓ Teachers, Courses, Rooms, Sections & Time Periods
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                        Safe Reset
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleExecuteCleanup('TIMETABLE_ENTRIES_ONLY')}
                        disabled={isCleaning}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear Grid</span>
                      </button>
                    </td>
                  </tr>

                  {/* Row 2: All Timetables */}
                  <tr className="hover:bg-[#F8FBFC] transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">🗑️</span>
                        <div>
                          <strong className="text-xs font-bold text-[#002E4E] block">Clear All Timetable Schedules</strong>
                          <span className="text-[11px] text-[#4A6375]">Multi-semester timetable purge</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-[#4A6375]">
                      All timetables, versions & session history across all 4 years
                    </td>
                    <td className="px-5 py-4 text-xs text-emerald-700 font-medium">
                      ✓ Teachers, Courses, Rooms, Sections & Time Periods
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Moderate
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleExecuteCleanup('ALL_TIMETABLES_AND_SESSIONS')}
                        disabled={isCleaning}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear All Timetables</span>
                      </button>
                    </td>
                  </tr>

                  {/* Row 3: Curriculum & Activities */}
                  <tr className="hover:bg-[#F8FBFC] transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">📦</span>
                        <div>
                          <strong className="text-xs font-bold text-[#002E4E] block">Clear Timetables & Curriculum Subjects</strong>
                          <span className="text-[11px] text-[#4A6375]">Pre-import clean for new Excel upload</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-[#4A6375]">
                      Timetables, course subjects, activity assignments & imported data
                    </td>
                    <td className="px-5 py-4 text-xs text-emerald-700 font-medium">
                      ✓ Teachers, Rooms, Departments & Time Periods
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                        Pre-Import
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleExecuteCleanup('CLEAR_CURRICULUM_AND_ACTIVITIES')}
                        disabled={isCleaning}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear Curriculum</span>
                      </button>
                    </td>
                  </tr>

                  {/* Row 4: Total Factory Reset */}
                  <tr className="hover:bg-rose-50/40 transition bg-rose-50/20">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg text-rose-600">⚡</span>
                        <div>
                          <strong className="text-xs font-bold text-rose-950 block">Complete Factory Clean Reset</strong>
                          <span className="text-[11px] text-rose-800">Total database wipe to clean baseline</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-rose-800">
                      Wipes all custom data and resets to baseline
                    </td>
                    <td className="px-5 py-4 text-xs text-emerald-700 font-medium">
                      ✓ Core 4 Departments (CSE, AI&DS, AI&ML, Cyber Security) & Super Admin
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        Total Wipe
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleExecuteCleanup('FULL_FACTORY_RESET')}
                        disabled={isCleaning}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ml-auto cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Factory Reset</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Feedback message */}
          {cleanupFeedback && (
            <div
              className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2.5 ${
                cleanupFeedback.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {cleanupFeedback.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{cleanupFeedback.text}</span>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS SECTION                                                            */}
      {/* ========================================================================= */}

      {/* MODAL: ADD TIME SLOT */}
      {showAddSlotModal && (
        <div className="fixed inset-0 z-50 bg-[#002E4E]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E6ED] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#D8E6ED] pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#2582A1]" />
                <h3 className="font-bold text-lg text-[#002E4E]">Add Time Period</h3>
              </div>
              <button onClick={() => setShowAddSlotModal(false)} className="text-[#4A6375] hover:text-[#002E4E]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSlot} className="space-y-4 text-sm">
              <div>
                <label className="block text-[#4A6375] text-xs font-bold mb-1">Academic Year</label>
                <select
                  value={slotFormData.yearNumber}
                  onChange={e => setSlotFormData({ ...slotFormData, yearNumber: parseInt(e.target.value, 10) })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm font-bold focus:border-[#2582A1]"
                >
                  <option value={1}>1st Year (B.Tech Year 1)</option>
                  <option value={2}>2nd Year (B.Tech Year 2)</option>
                  <option value={3}>3rd Year (B.Tech Year 3)</option>
                  <option value={4}>4th Year (B.Tech Year 4)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#4A6375] text-xs font-bold mb-1">Day of Week</label>
                <select
                  value={slotFormData.day}
                  onChange={e => setSlotFormData({ ...slotFormData, day: parseInt(e.target.value, 10) })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                >
                  {daysOfWeek.map((dayName, idx) => (
                    <option key={idx} value={idx}>{dayName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4A6375] text-xs font-bold mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={slotFormData.startTime}
                    onChange={e => setSlotFormData({ ...slotFormData, startTime: e.target.value })}
                    className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A6375] text-xs font-bold mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={slotFormData.endTime}
                    onChange={e => setSlotFormData({ ...slotFormData, endTime: e.target.value })}
                    className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#4A6375] text-xs font-bold mb-1">Period Label (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Period 1, Afternoon Lab, Lunch Break"
                  value={slotFormData.label}
                  onChange={e => setSlotFormData({ ...slotFormData, label: e.target.value })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isBreakSlot"
                  checked={slotFormData.isBreak}
                  onChange={e => setSlotFormData({ ...slotFormData, isBreak: e.target.checked })}
                  className="rounded bg-white border-[#D8E6ED] text-[#2582A1]"
                />
                <label htmlFor="isBreakSlot" className="text-xs text-[#002E4E] font-medium cursor-pointer">Is this a break / interval period?</label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D8E6ED]">
                <button
                  type="button"
                  onClick={() => setShowAddSlotModal(false)}
                  className="px-4 py-2 bg-[#F4F8FA] hover:bg-[#E8F4F8] text-[#4A6375] rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Create Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COPY YEAR SCHEDULE */}
      {showCopyYearModal && (
        <div className="fixed inset-0 z-50 bg-[#002E4E]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E6ED] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-[#D8E6ED] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-lg text-[#002E4E]">Copy Period Timings Between Years</h3>
              </div>
              <button onClick={() => setShowCopyYearModal(false)} className="text-[#4A6375] hover:text-[#002E4E]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCopyYear} className="space-y-4 text-sm">
              <p className="text-xs text-[#4A6375] leading-relaxed">
                Duplicate all time slots & period boundaries from one year to another so you don't have to enter them manually for each year.
              </p>

              <div>
                <label className="block text-[#4A6375] text-xs font-bold mb-1">Source Schedule</label>
                <select
                  value={copyYearData.sourceYear}
                  onChange={e => setCopyYearData({ ...copyYearData, sourceYear: parseInt(e.target.value, 10) })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm font-bold focus:border-[#2582A1]"
                >
                  <option value={1}>1st Year Schedule</option>
                  <option value={2}>2nd Year Schedule</option>
                  <option value={3}>3rd Year Schedule</option>
                  <option value={4}>4th Year Schedule</option>
                </select>
              </div>

              <div>
                <label className="block text-[#4A6375] text-xs font-bold mb-1">Target Academic Year</label>
                <select
                  value={copyYearData.targetYear}
                  onChange={e => setCopyYearData({ ...copyYearData, targetYear: parseInt(e.target.value, 10) })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm font-bold focus:border-[#2582A1]"
                >
                  <option value={1}>1st Year (B.Tech Year 1)</option>
                  <option value={2}>2nd Year (B.Tech Year 2)</option>
                  <option value={3}>3rd Year (B.Tech Year 3)</option>
                  <option value={4}>4th Year (B.Tech Year 4)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D8E6ED]">
                <button
                  type="button"
                  onClick={() => setShowCopyYearModal(false)}
                  className="px-4 py-2 bg-[#F4F8FA] hover:bg-[#E8F4F8] text-[#4A6375] rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Duplicate Timings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APPLY ALL DAYS */}
      {showApplyAllDaysModal && (
        <div className="fixed inset-0 z-50 bg-[#002E4E]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E6ED] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-[#D8E6ED] pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#2582A1]" />
                <h3 className="font-bold text-lg text-[#002E4E]">Sync Timings Across All 6 Days</h3>
              </div>
              <button onClick={() => setShowApplyAllDaysModal(false)} className="text-[#4A6375] hover:text-[#002E4E]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyAllDays} className="space-y-4 text-sm">
              <p className="text-xs text-[#4A6375] leading-relaxed">
                Take the period slots from the chosen source day and automatically duplicate them to all 6 days (Monday through Saturday).
              </p>

              <div>
                <label className="block text-[#4A6375] text-xs font-bold mb-1">Target Academic Year</label>
                <select
                  value={applyDaysData.year}
                  onChange={e => setApplyDaysData({ ...applyDaysData, year: parseInt(e.target.value, 10) })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm font-bold focus:border-[#2582A1]"
                >
                  <option value={1}>1st Year (B.Tech Year 1)</option>
                  <option value={2}>2nd Year (B.Tech Year 2)</option>
                  <option value={3}>3rd Year (B.Tech Year 3)</option>
                  <option value={4}>4th Year (B.Tech Year 4)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#4A6375] text-xs font-bold mb-1">Source Day Timings to Copy</label>
                <select
                  value={applyDaysData.sourceDay}
                  onChange={e => setApplyDaysData({ ...applyDaysData, sourceDay: parseInt(e.target.value, 10) })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                >
                  {daysOfWeek.map((dayName, idx) => (
                    <option key={idx} value={idx}>{dayName}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D8E6ED]">
                <button
                  type="button"
                  onClick={() => setShowApplyAllDaysModal(false)}
                  className="px-4 py-2 bg-[#F4F8FA] hover:bg-[#E8F4F8] text-[#4A6375] rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Apply to All 6 Days
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ROOM */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 bg-[#002E4E]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E6ED] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#D8E6ED] pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#2582A1]" />
                <h3 className="font-bold text-lg text-[#002E4E]">Add Classroom / Laboratory</h3>
              </div>
              <button onClick={() => setShowAddRoomModal(false)} className="text-[#4A6375] hover:text-[#002E4E]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4A6375] text-xs font-bold mb-1">Room Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CR-401, AI Lab 2"
                    value={roomFormData.name}
                    onChange={e => setRoomFormData({ ...roomFormData, name: e.target.value })}
                    className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A6375] text-xs font-bold mb-1">Room Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CR-401"
                    value={roomFormData.code}
                    onChange={e => setRoomFormData({ ...roomFormData, code: e.target.value })}
                    className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#4A6375] text-xs font-bold mb-1">Building</label>
                <select
                  required
                  value={roomFormData.buildingId}
                  onChange={e => setRoomFormData({ ...roomFormData, buildingId: e.target.value })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                >
                  {buildings.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4A6375] text-xs font-bold mb-1">Seating Capacity</label>
                  <input
                    type="number"
                    min="10"
                    value={roomFormData.capacity}
                    onChange={e => setRoomFormData({ ...roomFormData, capacity: parseInt(e.target.value, 10) || 60 })}
                    className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A6375] text-xs font-bold mb-1">Floor Level</label>
                  <input
                    type="number"
                    min="0"
                    value={roomFormData.floor}
                    onChange={e => setRoomFormData({ ...roomFormData, floor: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#4A6375] text-xs font-bold mb-1">Room Type</label>
                <select
                  value={roomFormData.type}
                  onChange={e => setRoomFormData({ ...roomFormData, type: e.target.value })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                >
                  <option value="CLASSROOM">Classroom (Regular Lecture)</option>
                  <option value="COMPUTER_LAB">Computer Laboratory</option>
                  <option value="LECTURE_HALL">Auditorium / Seminar Hall</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D8E6ED]">
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="px-4 py-2 bg-[#F4F8FA] hover:bg-[#E8F4F8] text-[#4A6375] rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Create Venue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD BUILDING */}
      {showAddBuildingModal && (
        <div className="fixed inset-0 z-50 bg-[#002E4E]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E6ED] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#D8E6ED] pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#2582A1]" />
                <h3 className="font-bold text-lg text-[#002E4E]">Add Campus Building</h3>
              </div>
              <button onClick={() => setShowAddBuildingModal(false)} className="text-[#4A6375] hover:text-[#002E4E]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBuilding} className="space-y-4 text-sm">
              <div>
                <label className="block text-[#4A6375] text-xs font-bold mb-1">Building Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Technology Tower, Innovation Block"
                  value={newBuildingData.name}
                  onChange={e => setNewBuildingData({ ...newBuildingData, name: e.target.value })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                />
              </div>

              <div>
                <label className="block text-[#4A6375] text-xs font-bold mb-1">Building Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BLD-TECH, BLD-INNOV"
                  value={newBuildingData.code}
                  onChange={e => setNewBuildingData({ ...newBuildingData, code: e.target.value })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D8E6ED]">
                <button
                  type="button"
                  onClick={() => setShowAddBuildingModal(false)}
                  className="px-4 py-2 bg-[#F4F8FA] hover:bg-[#E8F4F8] text-[#4A6375] rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Add Building
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SECTION */}
      {showAddSectionModal && (
        <div className="fixed inset-0 z-50 bg-[#002E4E]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E6ED] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#D8E6ED] pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#2582A1]" />
                <h3 className="font-bold text-lg text-[#002E4E]">Add Section / Class Cohort</h3>
              </div>
              <button onClick={() => setShowAddSectionModal(false)} className="text-[#4A6375] hover:text-[#002E4E]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSection} className="space-y-4 text-sm">
              <div>
                <label className="block text-[#4A6375] text-xs font-bold mb-1">Section Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSE-A, AI&DS-B, CYS-A, AI&ML-C"
                  value={sectionFormData.name}
                  onChange={e => setSectionFormData({ ...sectionFormData, name: e.target.value })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                />
              </div>

              <div>
                <label className="block text-[#4A6375] text-xs font-bold mb-1">Semester</label>
                <select
                  required
                  value={sectionFormData.semesterId}
                  onChange={e => setSectionFormData({ ...sectionFormData, semesterId: e.target.value })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                >
                  <option value="">Select Semester...</option>
                  {cohortsData?.semesters?.map((sem: any) => (
                    <option key={sem.id} value={sem.id}>
                      {sem.name || `Semester ${sem.semester_number}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#4A6375] text-xs font-bold mb-1">Student Capacity / Count</label>
                <input
                  type="number"
                  min="1"
                  value={sectionFormData.studentCount}
                  onChange={e => setSectionFormData({ ...sectionFormData, studentCount: parseInt(e.target.value, 10) || 60 })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D8E6ED]">
                <button
                  type="button"
                  onClick={() => setShowAddSectionModal(false)}
                  className="px-4 py-2 bg-[#F4F8FA] hover:bg-[#E8F4F8] text-[#4A6375] rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Create Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD BATCH */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 bg-[#002E4E]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D8E6ED] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#D8E6ED] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#2582A1]" />
                <h3 className="font-bold text-lg text-[#002E4E]">Add Academic Batch</h3>
              </div>
              <button onClick={() => setShowAddBatchModal(false)} className="text-[#4A6375] hover:text-[#002E4E]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBatch} className="space-y-4 text-sm">
              <div>
                <label className="block text-[#4A6375] text-xs font-bold mb-1">Batch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Batch 2024-2028"
                  value={newBatchData.name}
                  onChange={e => setNewBatchData({ ...newBatchData, name: e.target.value })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                />
              </div>

              <div>
                <label className="block text-[#4A6375] text-xs font-bold mb-1">Academic Year Number (1 - 4)</label>
                <select
                  value={newBatchData.year}
                  onChange={e => setNewBatchData({ ...newBatchData, year: parseInt(e.target.value, 10) })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm font-bold focus:border-[#2582A1]"
                >
                  <option value={1}>Year 1 (1st Year)</option>
                  <option value={2}>Year 2 (2nd Year)</option>
                  <option value={3}>Year 3 (3rd Year)</option>
                  <option value={4}>Year 4 (Final Year)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4A6375] text-xs font-bold mb-1">Start Year</label>
                  <input
                    type="number"
                    value={newBatchData.startYear}
                    onChange={e => setNewBatchData({ ...newBatchData, startYear: parseInt(e.target.value, 10) })}
                    className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                  />
                </div>
                <div>
                  <label className="block text-[#4A6375] text-xs font-bold mb-1">End Year</label>
                  <input
                    type="number"
                    value={newBatchData.endYear}
                    onChange={e => setNewBatchData({ ...newBatchData, endYear: parseInt(e.target.value, 10) })}
                    className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D8E6ED]">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-4 py-2 bg-[#F4F8FA] hover:bg-[#E8F4F8] text-[#4A6375] rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-xs"
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
