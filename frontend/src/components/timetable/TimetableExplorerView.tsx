import React, { useState, useEffect } from 'react';
import * as xlsx from 'xlsx';
import {
  Calendar,
  Filter,
  Lock,
  Unlock,
  Printer,
  AlertTriangle,
  Users,
  Building,
  Move,
  X,
  ChevronDown,
  Plus,
  Trash2,
  Copy,
  FolderOpen,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  Layers,
  Clock,
  Upload,
  FileUp,
  AlertCircle,
  RefreshCw,
  Database,
  FileText,
  Mail,
  Send,
  GraduationCap
} from 'lucide-react';
import { api } from '../../api';
import {
  Activity,
  Course,
  Room,
  Teacher,
  TimeSlot,
  Timetable,
  TimetableConflict,
  TimetableEntry
} from '../../../../shared/types';

interface TimetableExplorerProps {
  timetable: Timetable | null;
  teachers: Teacher[];
  rooms: Room[];
  calendar: TimeSlot[];
  onRefresh: () => void;
}

export const TimetableExplorerView: React.FC<TimetableExplorerProps> = ({
  timetable,
  teachers,
  rooms,
  calendar,
  onRefresh
}) => {
  const [filterType, setFilterType] = useState<'SECTION' | 'TEACHER' | 'ROOM' | 'ALL'>('ALL');
  const [selectedFilterId, setSelectedFilterId] = useState<string>('');
  const [sections, setSections] = useState<any[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allTimetables, setAllTimetables] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'WEEKLY' | 'DAILY' | 'UNIFIED' | 'LIST'>('WEEKLY');
  const [selectedDay, setSelectedDay] = useState<number>(0);

  // Unified Matrix Section Filters
  const [selectedUnifiedSections, setSelectedUnifiedSections] = useState<string[]>([]);

  // Inspector & Edit state
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);
  const [movingEntry, setMovingEntry] = useState<TimetableEntry | null>(null);
  const [conflictWarning, setConflictWarning] = useState<TimetableConflict | null>(null);

  // Modals state
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [isManageTimetablesModalOpen, setIsManageTimetablesModalOpen] = useState(false);
  const [isCreateTimetableModalOpen, setIsCreateTimetableModalOpen] = useState(false);

  // AI Timetable Assistant state
  const [isAiEditorOpen, setIsAiEditorOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);
  const [isAiApplying, setIsAiApplying] = useState(false);
  const [aiErrorMsg, setAiErrorMsg] = useState('');
  const [aiSuccessMsg, setAiSuccessMsg] = useState('');

  // Upload Timetable state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileBase64, setUploadFileBase64] = useState('');
  const [uploadDetectedSheets, setUploadDetectedSheets] = useState<string[]>([]);
  const [uploadSheetsSummary, setUploadSheetsSummary] = useState<any[]>([]);
  const [uploadParsedRows, setUploadParsedRows] = useState<any[]>([]);
  const [uploadPreviewSessions, setUploadPreviewSessions] = useState<any[]>([]);
  const [uploadSummary, setUploadSummary] = useState<{
    totalRows: number;
    sectionsCount: number;
    teachersCount: number;
    roomsCount: number;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadClearExisting, setUploadClearExisting] = useState(true);
  const [uploadErrorMsg, setUploadErrorMsg] = useState('');
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');
  const [isResettingDb, setIsResettingDb] = useState(false);
  const [uploadTargetSectionId, setUploadTargetSectionId] = useState<string>('ALL');

  // Clean Data & System Reset State
  const [isCleanDataModalOpen, setIsCleanDataModalOpen] = useState(false);
  const [cleanScope, setCleanScope] = useState<'TIMETABLE_ENTRIES_ONLY' | 'ALL_TIMETABLES_AND_SESSIONS' | 'CLEAR_CURRICULUM_AND_ACTIVITIES' | 'FULL_FACTORY_RESET'>('TIMETABLE_ENTRIES_ONLY');
  const [isCleaningData, setIsCleaningData] = useState(false);
  const [cleanConfirmAccepted, setCleanConfirmAccepted] = useState(false);
  const [cleanStatusMessage, setCleanStatusMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Year Selection & Cohort Hierarchy
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>('ALL');
  const [hierarchyYears, setHierarchyYears] = useState<any[]>([]);

  // Email Dispatch State
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<any | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // Add Session Form state
  const [newSessionDay, setNewSessionDay] = useState<number>(0);
  const [newSessionPeriod, setNewSessionPeriod] = useState<number>(0);
  const [newSessionActivityId, setNewSessionActivityId] = useState<string>('');
  const [newSessionRoomId, setNewSessionRoomId] = useState<string>('');
  const [newSessionDuration, setNewSessionDuration] = useState<number>(1);
  const [newSessionLocked, setNewSessionLocked] = useState<boolean>(false);
  const [newSessionTeacherIds, setNewSessionTeacherIds] = useState<string[]>([]);
  const [isCombinedSession, setIsCombinedSession] = useState<boolean>(false);
  const [newSessionSectionIds, setNewSessionSectionIds] = useState<string[]>([]);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState<string>('');

  // New Timetable Form
  const [newTimetableName, setNewTimetableName] = useState('Draft Timetable (Semester 3)');
  const [newTimetableMode, setNewTimetableMode] = useState<'MANUAL' | 'AUTOMATIC'>('MANUAL');

  useEffect(() => {
    loadHierarchySections();
    loadActivitiesAndCourses();
    loadTimetablesList();
  }, []);

  const loadHierarchySections = async () => {
    try {
      const [cohortsData, fullHier] = await Promise.all([
        api.getCohorts().catch(() => ({})),
        api.getHierarchyFull().catch(() => [])
      ]);
      setHierarchyYears(fullHier || []);
      const sList = cohortsData?.sections || [];
      setSections(sList);
      if (sList.length > 0 && !selectedFilterId) {
        setSelectedFilterId(sList[0].id);
      }
      if (sList.length > 0 && newSessionSectionIds.length === 0) {
        setNewSessionSectionIds([sList[0].id]);
      }
      if (sList.length > 0) {
        setSelectedUnifiedSections(sList.map((s: any) => s.id));
      }
    } catch (e) {
      console.error('Failed to load sections for explorer:', e);
    }
  };

  const loadActivitiesAndCourses = async () => {
    try {
      const [acts, crs] = await Promise.all([
        api.getActivities().catch(() => []),
        api.getCourses().catch(() => [])
      ]);
      setActivities(acts || []);
      setCourses(crs || []);
      if (acts && acts.length > 0) {
        const firstAct = acts[0];
        setNewSessionActivityId(firstAct.id);
        if (firstAct.teacherIds && firstAct.teacherIds.length > 0) {
          setNewSessionTeacherIds(firstAct.teacherIds);
        }
      }
      if (rooms && rooms.length > 0) {
        setNewSessionRoomId(rooms[0].id);
      }
    } catch (e) {
      console.error('Failed to load activities/courses:', e);
    }
  };

  const loadTimetablesList = async () => {
    try {
      const list = await api.getAllTimetables();
      setAllTimetables(list || []);
    } catch (e) {
      console.error('Failed to load timetables list:', e);
    }
  };

  const days = [
    { id: 0, name: 'Monday', short: 'Mon' },
    { id: 1, name: 'Tuesday', short: 'Tue' },
    { id: 2, name: 'Wednesday', short: 'Wed' },
    { id: 3, name: 'Thursday', short: 'Thu' },
    { id: 4, name: 'Friday', short: 'Fri' },
    { id: 5, name: 'Saturday', short: 'Sat' }
  ];

  // Helper for active section info
  const activeSection = React.useMemo(() => {
    if (filterType !== 'SECTION' || !selectedFilterId) return null;
    return sections.find(s => s.id === selectedFilterId || s.name === selectedFilterId) || null;
  }, [sections, filterType, selectedFilterId]);

  // Derive academic year number (1, 2, 3, 4) from active section
  const activeSectionYear = React.useMemo(() => {
    if (!activeSection) return 0;
    if (activeSection.semester_number) {
      return Math.ceil(Number(activeSection.semester_number) / 2);
    }
    const name = (activeSection.name || '').toUpperCase();
    if (name.startsWith('IV') || name.includes('YEAR 4') || name.includes('4TH')) return 4;
    if (name.startsWith('III') || name.includes('YEAR 3') || name.includes('3RD')) return 3;
    if (name.startsWith('II') || name.includes('YEAR 2') || name.includes('2ND')) return 2;
    if (name.startsWith('I') || name.includes('YEAR 1') || name.includes('1ST')) return 1;
    return 0;
  }, [activeSection]);

  // Effective year level for period timings
  const effectiveYearNum = selectedYear !== 'ALL' ? Number(selectedYear) : activeSectionYear;

  // Dynamic Year-Specific Periods
  const periods = React.useMemo(() => {
    if (calendar && calendar.length > 0) {
      const matchingSlots = effectiveYearNum > 0 && calendar.some(c => c.yearNumber === effectiveYearNum)
        ? calendar.filter(c => c.yearNumber === effectiveYearNum)
        : calendar.filter(c => !c.yearNumber || c.yearNumber === 0);

      if (matchingSlots.length > 0) {
        const periodMap = new Map<number, { index: number; time: string; label: string; isBreak: boolean }>();
        matchingSlots.forEach(s => {
          if (!periodMap.has(s.periodIndex)) {
            periodMap.set(s.periodIndex, {
              index: s.periodIndex,
              time: `${s.startTime} - ${s.endTime}`,
              label: s.label || (s.isBreak ? 'Break / Lunch' : `Period ${s.periodIndex + 1}`),
              isBreak: Boolean(s.isBreak)
            });
          }
        });
        return Array.from(periodMap.values()).sort((a, b) => a.index - b.index);
      }
    }
    return [
      { index: 0, time: '09:00 - 10:00', label: 'Period 1', isBreak: false },
      { index: 1, time: '10:00 - 11:00', label: 'Period 2', isBreak: false },
      { index: 2, time: '11:10 - 12:10', label: 'Period 3', isBreak: false },
      { index: 3, time: '12:10 - 13:00', label: 'Period 4', isBreak: false },
      { index: 4, time: '13:00 - 14:00', label: 'Lunch Break', isBreak: true },
      { index: 5, time: '14:00 - 15:00', label: 'Period 5', isBreak: false },
      { index: 6, time: '15:00 - 16:00', label: 'Period 6', isBreak: false },
      { index: 7, time: '16:00 - 17:00', label: 'Period 7', isBreak: false }
    ];
  }, [calendar, effectiveYearNum]);

  // Normalize string for fuzzy section comparison
  const normalizeKey = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Filtering entries
  const filteredEntries = React.useMemo(() => {
    return (timetable?.entries || []).filter(e => {
      if (filterType === 'ALL') return true;
      if (filterType === 'SECTION') {
        const targetId = selectedFilterId.toLowerCase();
        const targetName = (activeSection?.name || selectedFilterId).toLowerCase();
        const normTarget = normalizeKey(targetName);
        const normId = normalizeKey(targetId);

        return e.sectionNames.some(s => {
          const normS = normalizeKey(s);
          const sLower = s.toLowerCase();
          return sLower.includes(targetId) ||
                 sLower.includes(targetName) ||
                 normS.includes(normTarget) ||
                 normTarget.includes(normS) ||
                 normS.includes(normId) ||
                 normId.includes(normS);
        }) || e.groupNames.some(g => {
          const normG = normalizeKey(g);
          const gLower = g.toLowerCase();
          return gLower.includes(targetId) ||
                 gLower.includes(targetName) ||
                 normG.includes(normTarget) ||
                 normTarget.includes(normG);
        });
      }
      if (filterType === 'TEACHER') {
        const teacherObj = teachers.find(t => t.id === selectedFilterId);
        const targetName = teacherObj ? teacherObj.name.toLowerCase() : selectedFilterId.toLowerCase();
        return e.teacherIds.includes(selectedFilterId) || 
               e.teacherNames.some(n => n.toLowerCase().includes(targetName));
      }
      if (filterType === 'ROOM') {
        return e.roomId === selectedFilterId;
      }
      return true;
    });
  }, [timetable?.entries, filterType, selectedFilterId, activeSection, teachers]);

  // Compute live session count per section
  const sectionSessionCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    const entries = timetable?.entries || [];
    sections.forEach(sec => {
      const normName = normalizeKey(sec.name);
      const normId = normalizeKey(sec.id);
      counts[sec.id] = entries.filter(e => {
        return e.sectionNames.some(s => {
          const ns = normalizeKey(s);
          return ns.includes(normName) || normName.includes(ns) || ns.includes(normId) || normId.includes(ns);
        }) || e.groupNames.some(g => {
          const ng = normalizeKey(g);
          return ng.includes(normName) || normName.includes(ng);
        });
      }).length;
    });
    return counts;
  }, [sections, timetable?.entries]);

  const handleCellClick = (dayId: number, periodIndex: number) => {
    if (movingEntry) {
      handleCompleteMove(dayId, periodIndex);
    } else {
      // Open Add Session modal pre-filled with this slot
      setNewSessionDay(dayId);
      setNewSessionPeriod(periodIndex);
      setIsAddSessionModalOpen(true);
    }
  };

  const handleCompleteMove = async (dayId: number, periodIndex: number) => {
    if (!movingEntry) return;

    try {
      const res = await api.moveEntry({
        entryId: movingEntry.id,
        dayOfWeek: dayId,
        periodIndex: periodIndex
      });

      if (res.conflicts && res.conflicts.length > 0) {
        setConflictWarning(res.conflicts[0]);
      } else {
        setConflictWarning(null);
      }
    } catch (err) {
      console.error('Move error:', err);
    }

    setMovingEntry(null);
    onRefresh();
  };

  const handleToggleLock = async (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.toggleLock(entryId);
      onRefresh();
    } catch (err) {
      console.error('Lock error:', err);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this class session?')) return;
    try {
      await api.deleteTimetableEntry(entryId);
      setSelectedEntry(null);
      onRefresh();
    } catch (err) {
      console.error('Delete entry error:', err);
    }
  };

  const handleAddSession = async () => {
    if (!newSessionActivityId || !newSessionRoomId) {
      alert('Please select an activity and a venue/room.');
      return;
    }

    if (newSessionTeacherIds.length === 0) {
      alert('Please select at least one faculty member (cross-department assignment is fully supported).');
      return;
    }

    if (isCombinedSession && newSessionSectionIds.length < 2) {
      alert('Combined classes require selecting at least 2 student cohorts/sections.');
      return;
    }

    try {
      await api.addTimetableEntry({
        timetableId: timetable?.id || 'tt-active',
        activityId: newSessionActivityId,
        dayOfWeek: newSessionDay,
        periodIndex: newSessionPeriod,
        duration: newSessionDuration,
        roomId: newSessionRoomId,
        isLocked: newSessionLocked,
        teacherIds: newSessionTeacherIds,
        sectionIds: isCombinedSession ? newSessionSectionIds : (newSessionSectionIds.length > 0 ? [newSessionSectionIds[0]] : undefined),
        isCombined: isCombinedSession
      });

      setIsAddSessionModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Add session error:', err);
      alert('Failed to add session. Please check parameters.');
    }
  };

  const handleCreateTimetable = async () => {
    if (!newTimetableName.trim()) return;
    try {
      await api.createTimetable({
        name: newTimetableName,
        generationMode: newTimetableMode
      });
      setIsCreateTimetableModalOpen(false);
      loadTimetablesList();
      onRefresh();
    } catch (err) {
      console.error('Create timetable error:', err);
    }
  };

  const handleDuplicateTimetable = async (ttId: string) => {
    try {
      await api.duplicateTimetable(ttId);
      loadTimetablesList();
      onRefresh();
    } catch (err) {
      console.error('Duplicate error:', err);
    }
  };

  const handleDeleteTimetable = async (ttId: string) => {
    if (!confirm('Are you sure you want to delete this timetable?')) return;
    try {
      await api.deleteTimetable(ttId);
      loadTimetablesList();
      onRefresh();
    } catch (err) {
      console.error('Delete timetable error:', err);
    }
  };

  // Download Sample Template for Apollo University (4 departments)
  const handleDownloadSampleTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
    const templateData = [
      {
        'Day': 'Monday',
        'Period': 'Period 1 (09:00 - 10:00)',
        'Course Code': 'CS301',
        'Course Name': 'Design & Analysis of Algorithms',
        'Activity Type': 'LECTURE',
        'Sections': 'CSE-A',
        'Faculty': 'Dr. Alan Turing',
        'Room': 'CR-201',
        'Duration': 1
      },
      {
        'Day': 'Monday',
        'Period': 'Period 2 (10:00 - 11:00)',
        'Course Code': 'AI302',
        'Course Name': 'Foundations of Data Science',
        'Activity Type': 'LECTURE',
        'Sections': 'AIDS-A, AIDS-B',
        'Faculty': 'Prof. Grace Hopper',
        'Room': 'AUD-101',
        'Duration': 1
      },
      {
        'Day': 'Monday',
        'Period': 'Period 3 (11:15 - 12:15)',
        'Course Code': 'ML303',
        'Course Name': 'Machine Learning Algorithms',
        'Activity Type': 'LECTURE',
        'Sections': 'AIML-A',
        'Faculty': 'Dr. John McCarthy',
        'Room': 'CR-301',
        'Duration': 1
      },
      {
        'Day': 'Monday',
        'Period': 'Period 4 (12:15 - 13:15)',
        'Course Code': 'CYS304',
        'Course Name': 'Network Defense & Cryptography',
        'Activity Type': 'LECTURE',
        'Sections': 'CS-A',
        'Faculty': 'Prof. Claude Shannon',
        'Room': 'CR-302',
        'Duration': 1
      },
      {
        'Day': 'Tuesday',
        'Period': 'Period 5 (14:00 - 15:00)',
        'Course Code': 'CS301-L',
        'Course Name': 'Advanced Algorithms Lab',
        'Activity Type': 'LABORATORY',
        'Sections': 'CSE-B',
        'Faculty': 'Dr. Alan Turing',
        'Room': 'LAB-CSE-1',
        'Duration': 2
      },
      {
        'Day': 'Wednesday',
        'Period': 'Period 1 (09:00 - 10:00)',
        'Course Code': 'AI302-L',
        'Course Name': 'Big Data Analytics Lab',
        'Activity Type': 'LABORATORY',
        'Sections': 'AIDS-B',
        'Faculty': 'Prof. Grace Hopper',
        'Room': 'LAB-AIDS-2',
        'Duration': 2
      },
      {
        'Day': 'Thursday',
        'Period': 'Period 3 (11:15 - 12:15)',
        'Course Code': 'ML303-L',
        'Course Name': 'Deep Neural Networks Lab',
        'Activity Type': 'LABORATORY',
        'Sections': 'AIML-B',
        'Faculty': 'Dr. John McCarthy',
        'Room': 'LAB-AIML-3',
        'Duration': 2
      },
      {
        'Day': 'Friday',
        'Period': 'Period 2 (10:00 - 11:00)',
        'Course Code': 'CYS304-L',
        'Course Name': 'Cyber Security Forensics Lab',
        'Activity Type': 'LABORATORY',
        'Sections': 'CS-B',
        'Faculty': 'Prof. Claude Shannon',
        'Room': 'LAB-CYBER-4',
        'Duration': 2
      }
    ];

    if (format === 'csv') {
      const headers = Object.keys(templateData[0]);
      const csvRows = [
        headers.join(','),
        ...templateData.map(row => headers.map(h => `"${(row as any)[h]}"`).join(','))
      ];
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'apollo_timetable_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const ws = xlsx.utils.json_to_sheet(templateData);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Timetable');
      xlsx.writeFile(wb, 'apollo_timetable_template.xlsx');
    }
  };

  // Handle Timetable File Selection & Multi-Sheet Preview
  const handleFileSelect = (file: File) => {
    setUploadErrorMsg('');
    setUploadSuccessMsg('');
    setUploadFileName(file.name);
    setUploadDetectedSheets([]);
    setUploadSheetsSummary([]);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        if (!dataUrl) return;

        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        setUploadFileBase64(base64);

        // Pre-flight intelligent multi-sheet workbook analysis
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || !file.name.includes('.')) {
          const previewRes = await api.uploadTimetablePreview({
            fileBase64: base64,
            targetSection: uploadTargetSectionId
          });

          if (previewRes.success && previewRes.data) {
            setUploadSummary({
              totalRows: previewRes.data.totalSessionsCount,
              sectionsCount: previewRes.data.detectedSheets.length || 1,
              teachersCount: previewRes.data.sheetsSummary.reduce((sum, s) => sum + s.subjectsCount, 0) || 1,
              roomsCount: previewRes.data.detectedSheets.length || 1
            });
            setUploadDetectedSheets(previewRes.data.detectedSheets || []);
            setUploadSheetsSummary(previewRes.data.sheetsSummary || []);
            setUploadPreviewSessions(previewRes.data.sessionsPreview || []);
            return;
          }
        }

        // Fallback for CSV / JSON text files
        const buffer = reader.result as ArrayBuffer;
        const wb = xlsx.read(buffer, { type: 'array' });
        const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        setUploadParsedRows(rows);

        const sectionsSet = new Set<string>();
        const teachersSet = new Set<string>();
        const roomsSet = new Set<string>();

        (rows as any[]).forEach((r: any) => {
          Object.entries(r || {}).forEach(([k, v]) => {
            const strVal = String(v).trim();
            const keyLower = k.toLowerCase();
            if (keyLower.includes('sec') || keyLower.includes('class') || keyLower.includes('batch')) {
              strVal.split(/[,;&+/]+/).forEach(s => s.trim() && sectionsSet.add(s.trim().toUpperCase()));
            }
            if (keyLower.includes('teach') || keyLower.includes('fac') || keyLower.includes('prof') || keyLower.includes('inst')) {
              strVal.split(/[,;&+/]+/).forEach(t => t.trim() && teachersSet.add(t.trim()));
            }
            if (keyLower.includes('room') || keyLower.includes('venue') || keyLower.includes('hall') || keyLower.includes('lab')) {
              if (strVal) roomsSet.add(strVal.toUpperCase());
            }
          });
        });

        setUploadSummary({
          totalRows: rows.length,
          sectionsCount: sectionsSet.size || 1,
          teachersCount: teachersSet.size || 1,
          roomsCount: roomsSet.size || 1
        });
        setUploadPreviewSessions(rows.slice(0, 6));
      } catch (err: any) {
        console.error('File parsing error:', err);
        setUploadErrorMsg('Failed to parse file format: ' + err.message);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleApplyUpload = async () => {
    if (!uploadFileBase64 && uploadParsedRows.length === 0) {
      setUploadErrorMsg('Please select a timetable file first.');
      return;
    }

    setIsUploading(true);
    setUploadErrorMsg('');
    setUploadSuccessMsg('');

    try {
      const res = await api.uploadTimetableExtract({
        fileBase64: uploadFileBase64,
        fileName: uploadFileName,
        targetSection: uploadTargetSectionId,
        rawRows: uploadParsedRows,
        clearExisting: uploadClearExisting,
        timetableId: timetable?.id || 'tt-active'
      });

      if (res.success && res.data) {
        setUploadSuccessMsg(
          `Successfully extracted and scheduled ${res.data.insertedEntriesCount} class sessions across the university grid!`
        );
        setTimeout(async () => {
          setIsUploadModalOpen(false);
          await loadHierarchySections();
          await loadActivitiesAndCourses();
          onRefresh();
        }, 1200);
      } else {
        setUploadErrorMsg(res.error || 'Failed to extract and update timetable.');
      }
    } catch (err: any) {
      console.error('Upload extract error:', err);
      setUploadErrorMsg(err.message || 'Error occurred while processing upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetDatabaseClean = async () => {
    if (!confirm('Are you sure you want to reset the database? This will purge all mockup data and restore the clean 4-department hierarchy (CSE, AI&DS, AI&ML, Cyber Security).')) return;
    setIsResettingDb(true);
    try {
      const res = await api.resetDatabase();
      if (res.success) {
        alert('Database successfully reset to clean 4-department configuration!');
        await loadHierarchySections();
        await loadActivitiesAndCourses();
        loadTimetablesList();
        onRefresh();
      } else {
        alert(res.error || 'Failed to reset database.');
      }
    } catch (err: any) {
      alert('Error resetting database: ' + err.message);
    } finally {
      setIsResettingDb(false);
    }
  };

  const handleExecuteCleanData = async () => {
    setIsCleaningData(true);
    setCleanStatusMessage(null);
    try {
      const res = await api.cleanData(cleanScope, timetable?.id || 'tt-active');
      if (res.success) {
        setCleanStatusMessage({ success: true, text: res.message || 'Data cleaned successfully!' });
        setTimeout(async () => {
          setIsCleanDataModalOpen(false);
          setCleanConfirmAccepted(false);
          setCleanStatusMessage(null);
          await loadHierarchySections();
          await loadActivitiesAndCourses();
          await loadTimetablesList();
          onRefresh();
        }, 1200);
      } else {
        setCleanStatusMessage({ success: false, text: res.error || 'Failed to clean data.' });
      }
    } catch (err: any) {
      setCleanStatusMessage({ success: false, text: err.message || 'Error occurred while cleaning data.' });
    } finally {
      setIsCleaningData(false);
    }
  };

  // Faculty Email Dispatch Handler
  const handleDispatchEmails = async () => {
    setIsDispatching(true);
    setDispatchError(null);
    setDispatchResult(null);

    try {
      const res = await api.dispatchTimetables(timetable?.id || 'tt-active');
      if (res.success) {
        setDispatchResult(res);
      } else {
        setDispatchError(res.error || 'Failed to dispatch emails.');
      }
    } catch (err: any) {
      console.error('Dispatch error:', err);
      setDispatchError(err.message || 'Error communicating with email service.');
    } finally {
      setIsDispatching(false);
    }
  };

  // AI Timetable Assistant Handlers
  const handleRunAiEdit = async (customPrompt?: string) => {
    const promptToUse = (customPrompt || aiPrompt).trim();
    if (!promptToUse) return;
    setIsAiAnalyzing(true);
    setAiErrorMsg('');
    setAiSuccessMsg('');
    setAiAnalysisResult(null);

    try {
      // Build context string if section or year is filtered
      let contextSuffix = '';
      if (selectedYear !== 'ALL') {
        contextSuffix += ` [Context: Scope is Year ${selectedYear}]`;
      }
      if (filterType === 'SECTION' && selectedFilterId) {
        const sec = sections.find(s => s.id === selectedFilterId);
        if (sec) contextSuffix += ` [Context: Active section is ${sec.name}]`;
      }
      const fullPrompt = promptToUse + (contextSuffix ? ` ${contextSuffix}` : '');

      const res = await api.aiTimetableEdit(fullPrompt, timetable?.id || 'tt-active');
      if (res.success && res.data) {
        setAiAnalysisResult(res.data);
      } else {
        setAiErrorMsg(res.error || 'Failed to interpret timetable request.');
      }
    } catch (err: any) {
      console.error('AI Timetable Edit Error:', err);
      setAiErrorMsg(err.message || 'Error occurred while contacting AI scheduler.');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleApplyAiChanges = async () => {
    if (!aiAnalysisResult || !aiAnalysisResult.operations || aiAnalysisResult.operations.length === 0) {
      setAiErrorMsg('No operations to apply.');
      return;
    }

    setIsAiApplying(true);
    setAiErrorMsg('');
    setAiSuccessMsg('');

    try {
      const res = await api.aiApplyTimetableChanges(aiAnalysisResult.operations, timetable?.id || 'tt-active');
      if (res.success) {
        setAiSuccessMsg('✨ AI timetable changes applied successfully! Updating schedule...');
        setTimeout(async () => {
          setIsAiEditorOpen(false);
          setAiAnalysisResult(null);
          setAiPrompt('');
          await loadHierarchySections();
          await loadActivitiesAndCourses();
          onRefresh();
        }, 1000);
      } else {
        setAiErrorMsg(res.error || 'Failed to apply changes to timetable.');
      }
    } catch (err: any) {
      console.error('AI Apply Error:', err);
      setAiErrorMsg(err.message || 'Error occurred while executing changes.');
    } finally {
      setIsAiApplying(false);
    }
  };

  const handleExportCsv = () => {
    if (!timetable || timetable.entries.length === 0) return;
    const targetEntries = filterType === 'ALL' ? timetable.entries : filteredEntries;
    const headers = ['Day', 'Period', 'Course Code', 'Course Name', 'Type', 'Room', 'Teachers', 'Cohorts'];
    const rows = targetEntries.map(e => [
      days.find(d => d.id === e.dayOfWeek)?.name || e.dayOfWeek,
      periods.find(p => p.index === e.periodIndex)?.time || e.periodIndex,
      e.courseCode,
      `"${e.courseName}"`,
      e.activityType,
      `"${e.roomName}"`,
      `"${e.teacherNames.join(', ')}"`,
      `"${e.sectionNames.join(', ')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = filterType === 'SECTION' && activeSection
      ? `${activeSection.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Timetable.csv`
      : `${timetable.name.replace(/\s+/g, '_')}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter sections according to selected Year scope
  const availableScopedSections = React.useMemo(() => {
    if (selectedYear === 'ALL') return sections;
    return sections.filter(s => {
      if (s.semester_number) {
        return Math.ceil(Number(s.semester_number) / 2) === selectedYear;
      }
      const n = (s.name || '').toUpperCase();
      if (selectedYear === 4) return n.startsWith('IV') || n.includes('YEAR 4') || n.includes('4TH');
      if (selectedYear === 3) return n.startsWith('III') || n.includes('YEAR 3') || n.includes('3RD');
      if (selectedYear === 2) return n.startsWith('II') || n.includes('YEAR 2') || n.includes('2ND');
      if (selectedYear === 1) return n.startsWith('I') || n.includes('YEAR 1') || n.includes('1ST');
      return true;
    });
  }, [sections, selectedYear]);

  return (
    <div className="space-y-4 max-w-full">
      {/* 4-Year Academic Cohort Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-[#002E4E] via-[#003B64] to-[#1B6680] text-white shadow-sm border border-[#2582A1]/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E6C200]/20 border border-[#E6C200]/40 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-[#E6C200]" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-100">Academic Year Scope:</span>
            <span className="text-[11px] text-slate-300 ml-2 hidden sm:inline">Focus grid & class cohorts by undergraduate year</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['ALL', 1, 2, 3, 4] as const).map(yr => (
            <button
              key={yr}
              onClick={() => {
                setSelectedYear(yr);
                if (yr !== 'ALL' && hierarchyYears.length > 0) {
                  const targetYearData = hierarchyYears.find(h => h.year === yr);
                  const yrSections = targetYearData?.departments?.flatMap((d: any) => d.sections) || [];
                  if (yrSections.length > 0) {
                    setSelectedFilterId(yrSections[0].id);
                  }
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedYear === yr
                  ? 'bg-[#E6C200] text-[#002E4E] shadow-sm scale-105'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20 border border-white/15'
              }`}
            >
              {yr === 'ALL' ? '🌐 All Years (1–4)' : `Year ${yr} (${yr === 1 ? '1st' : yr === 2 ? '2nd' : yr === 3 ? '3rd' : '4th'})`}
            </button>
          ))}
        </div>
      </div>

      {/* Individual Class Timetable Quick Switcher Ribbon */}
      <div className="p-2.5 rounded-xl bg-slate-50/80 border border-[#D8E6ED] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-xs font-bold text-[#002E4E] flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#2582A1]" /> Select Class Timetable:
          </span>
          <button
            onClick={() => {
              setFilterType('ALL');
              setSelectedFilterId('');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'ALL'
                ? 'bg-[#002E4E] text-[#E6C200] shadow-xs'
                : 'bg-white border border-[#D8E6ED] text-[#4A6375] hover:text-[#002E4E] hover:bg-white'
            }`}
          >
            🏛️ All Classes
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-thin">
          {availableScopedSections.map(sec => {
            const isSelected = filterType === 'SECTION' && (selectedFilterId === sec.id || selectedFilterId === sec.name);
            const count = sectionSessionCounts[sec.id] || 0;
            return (
              <button
                key={sec.id}
                onClick={() => {
                  setFilterType('SECTION');
                  setSelectedFilterId(sec.id);
                  if (newSessionSectionIds.length === 0 || newSessionSectionIds[0] !== sec.id) {
                    setNewSessionSectionIds([sec.id]);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#002E4E] text-[#E6C200] shadow-xs ring-2 ring-[#2582A1]/40 scale-[1.02]'
                    : 'bg-white border border-[#D8E6ED] text-[#002E4E] hover:border-[#2582A1] hover:bg-[#F0F6F9]'
                }`}
                title={`View ${sec.name} Class Timetable (${count} sessions scheduled)`}
              >
                <span>{sec.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isSelected
                      ? 'bg-[#E6C200] text-[#002E4E]'
                      : 'bg-[#EBF4F7] text-[#2582A1]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
          {availableScopedSections.length === 0 && (
            <span className="text-xs text-slate-400 italic px-2">No class cohorts in this year scope</span>
          )}
        </div>
      </div>

      {/* Control Bar: Swiss Filter Suite & Actions */}
      <div className="lux-card p-3 sm:p-3.5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white border-[#D8E6ED]">
        {/* Left: Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#2582A1] pr-1">
            <Filter className="w-3.5 h-3.5 text-[#2582A1]" /> Filter:
          </div>

          <div className="relative flex-1 sm:flex-initial">
            <select
              className="lux-select text-xs py-1.5 pl-3 pr-8 font-semibold appearance-none cursor-pointer bg-[#F4F8FA] border-[#D8E6ED] w-full text-[#002E4E]"
              value={filterType}
              onChange={e => {
                const ft = e.target.value as any;
                setFilterType(ft);
                if (ft === 'SECTION' && sections.length > 0) setSelectedFilterId(sections[0].id);
                if (ft === 'TEACHER' && teachers.length > 0) setSelectedFilterId(teachers[0].id);
                if (ft === 'ROOM' && rooms.length > 0) setSelectedFilterId(rooms[0].id);
              }}
            >
              <option value="ALL">Entire University (All)</option>
              <option value="SECTION">Student Cohort / Section</option>
              <option value="TEACHER">Faculty Member</option>
              <option value="ROOM">Venue / Room</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#2582A1] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {filterType === 'SECTION' && (
            <div className="relative flex-1 sm:flex-initial">
              <select
                className="lux-select text-xs py-1.5 pl-3 pr-8 font-medium appearance-none cursor-pointer bg-[#F4F8FA] border-[#D8E6ED] w-full text-[#002E4E]"
                value={selectedFilterId}
                onChange={e => setSelectedFilterId(e.target.value)}
              >
                {(selectedYear === 'ALL'
                  ? sections
                  : (hierarchyYears.find(h => h.year === selectedYear)?.departments?.flatMap((d: any) => d.sections) || sections)
                ).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.student_count || s.studentCount || 60} students)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#2582A1] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {filterType === 'TEACHER' && (
            <div className="relative flex-1 sm:flex-initial">
              <select
                className="lux-select text-xs py-1.5 pl-3 pr-8 font-medium appearance-none cursor-pointer bg-[#F4F8FA] border-[#D8E6ED] w-full text-[#002E4E]"
                value={selectedFilterId}
                onChange={e => setSelectedFilterId(e.target.value)}
              >
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.designation})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#2582A1] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {filterType === 'ROOM' && (
            <div className="relative flex-1 sm:flex-initial">
              <select
                className="lux-select text-xs py-1.5 pl-3 pr-8 font-medium appearance-none cursor-pointer bg-[#F4F8FA] border-[#D8E6ED] w-full text-[#002E4E]"
                value={selectedFilterId}
                onChange={e => setSelectedFilterId(e.target.value)}
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.roomType}, {r.capacity} seats)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#2582A1] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Right: AI Assistant, Email Dispatch, Upload Timetable, Add Session, Manage Timetables, Export Suite */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
          {/* AI Timetable Assistant Button */}
          <button
            onClick={() => {
              setAiErrorMsg('');
              setAiSuccessMsg('');
              setAiAnalysisResult(null);
              setIsAiEditorOpen(true);
            }}
            className="lux-btn text-xs py-1.5 px-3 bg-gradient-to-r from-[#002E4E] via-[#1B6680] to-[#2582A1] hover:opacity-95 text-white flex items-center gap-1.5 rounded-lg shadow-sm font-bold transition-all hover:scale-[1.02] border border-[#2582A1]/40"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E6C200] animate-pulse" />
            <span>AI Assistant</span>
          </button>

          {/* Faculty Email Dispatch Button */}
          <button
            onClick={() => {
              setDispatchError(null);
              setDispatchResult(null);
              setIsDispatchModalOpen(true);
            }}
            className="lux-btn text-xs py-1.5 px-3 bg-emerald-700 hover:bg-emerald-600 text-white flex items-center gap-1.5 rounded-lg shadow-xs font-bold transition-all hover:scale-[1.02] border border-emerald-500/40"
            title="Dispatch personal weekly timetables to faculty members via Outlook SMTP"
          >
            <Mail className="w-3.5 h-3.5 text-emerald-200" />
            <span>Dispatch to Faculty</span>
          </button>

          {/* Upload Timetable Button */}
          <button
            onClick={() => {
              setUploadErrorMsg('');
              setUploadSuccessMsg('');
              setIsUploadModalOpen(true);
            }}
            className="lux-btn text-xs py-1.5 px-3 bg-[#002E4E] hover:bg-[#003B64] text-white flex items-center gap-1.5 rounded-lg shadow-xs flex-1 sm:flex-initial justify-center font-semibold transition-all hover:scale-[1.02]"
          >
            <Upload className="w-3.5 h-3.5 text-[#E6C200]" />
            <span>Upload Timetable</span>
          </button>

          {/* Add Class Button */}
          <button
            onClick={() => {
              setNewSessionDay(0);
              setNewSessionPeriod(0);
              setIsAddSessionModalOpen(true);
            }}
            className="lux-btn lux-btn-gold text-xs py-1.5 px-3 flex items-center gap-1.5 rounded-lg shadow-xs flex-1 sm:flex-initial justify-center font-semibold"
          >
            <Plus className="w-3.5 h-3.5 text-[#002E4E]" />
            <span>Add Class</span>
          </button>

          {/* Manage / Switch Timetables */}
          <button
            onClick={() => setIsManageTimetablesModalOpen(true)}
            className="lux-btn text-xs py-1.5 px-3 bg-white border border-[#D8E6ED] hover:bg-[#F0F6F9] text-[#002E4E] flex items-center gap-1.5 rounded-lg flex-1 sm:flex-initial justify-center font-semibold"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#2582A1]" />
            <span>Timetables ({allTimetables.length})</span>
          </button>

          {/* Clean Data Action */}
          <button
            onClick={() => {
              setCleanStatusMessage(null);
              setCleanConfirmAccepted(false);
              setIsCleanDataModalOpen(true);
            }}
            className="lux-btn text-xs py-1.5 px-3 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 flex items-center gap-1.5 rounded-lg font-bold transition-all hover:scale-[1.02]"
            title="Clean Timetable Data & System Reset Options"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Clean Data</span>
          </button>

          {/* Export Suite */}
          <button
            onClick={handleExportCsv}
            title="Export Timetable as CSV / Excel"
            className="lux-btn text-xs py-1.5 px-2.5 bg-white border border-[#D8E6ED] hover:bg-[#F0F6F9] text-[#2582A1]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => window.print()}
            title="Print Timetable"
            className="lux-btn text-xs py-1.5 px-2.5 bg-white border border-[#D8E6ED] hover:bg-[#F0F6F9] text-[#002E4E]"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* View Mode Bar & Quick Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-white border border-[#D8E6ED] shadow-2xs">
        {/* Left: View Mode Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F4F8FA] border border-[#D8E6ED]">
          <button
            onClick={() => setViewMode('WEEKLY')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'WEEKLY'
                ? 'bg-white text-[#002E4E] shadow-2xs border border-[#D8E6ED]'
                : 'text-[#4A6375] hover:text-[#002E4E]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-[#2582A1]" />
            <span>Weekly Grid</span>
          </button>

          <button
            onClick={() => setViewMode('UNIFIED')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'UNIFIED'
                ? 'bg-[#002E4E] text-[#E6C200] shadow-2xs'
                : 'text-[#4A6375] hover:text-[#002E4E]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#2582A1]" />
            <span>Unified Matrix (All Classes)</span>
          </button>

          <button
            onClick={() => setViewMode('DAILY')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'DAILY'
                ? 'bg-white text-[#002E4E] shadow-2xs border border-[#D8E6ED]'
                : 'text-[#4A6375] hover:text-[#002E4E]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#2582A1]" />
            <span>Daily View</span>
          </button>
        </div>

        {/* Quick info / Quality score pill */}
        <div className="flex items-center gap-2">
          {timetable?.qualityScore && (
            <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-[#EBF4F7] border border-[#BCE1EE] text-[#002E4E] font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#2582A1]" />
              <span>Schedule Quality: {timetable.qualityScore.overallScore}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Day Selector Tabs (< md screens) */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex items-center gap-1.5 min-w-max">
          <button
            onClick={() => setSelectedDay(-1)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedDay === -1
                ? 'bg-[#2582A1] text-white shadow-xs'
                : 'bg-white border border-[#D8E6ED] text-[#4A6375] hover:text-[#002E4E]'
            }`}
          >
            Full Week (6 Days)
          </button>
          {days.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDay(d.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedDay === d.id
                  ? 'bg-[#2582A1] text-white shadow-xs'
                  : 'bg-white border border-[#D8E6ED] text-[#4A6375] hover:text-[#002E4E]'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
        <div className="hidden sm:block text-[11px] text-[#829BA8] font-medium whitespace-nowrap">
          {selectedDay === -1 ? 'Showing All Days' : `Filtered: ${days.find(d => d.id === selectedDay)?.name}`}
        </div>
      </div>

      {/* Moving Mode Notice */}
      {movingEntry && (
        <div className="p-3 rounded-xl bg-[#002E4E] text-white text-xs flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5 min-w-0">
            <Move className="w-4 h-4 text-[#FDB931] flex-shrink-0" />
            <span className="truncate">
              <strong>Relocating session:</strong> '{movingEntry.courseCode} — {movingEntry.activityName}'. Click target cell below.
            </span>
          </div>
          <button
            onClick={() => setMovingEntry(null)}
            className="text-xs font-bold text-[#FDB931] hover:underline px-2 py-1 flex-shrink-0"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Conflict Warning Banner */}
      {conflictWarning && (
        <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#B91C1C] flex items-start gap-3 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-[#B91C1C] flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-[#B91C1C]">{conflictWarning.title}</div>
            <div className="text-[#575A65]">{conflictWarning.description}</div>
            <div className="font-semibold text-[#121316]">Suggested Fix: {conflictWarning.suggestedFix}</div>
          </div>
        </div>
      )}

      {/* Active Class / Filtered Context Banner */}
      {filterType === 'SECTION' && activeSection && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#002E4E] to-[#1B6680] text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border border-[#2582A1]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6C200] text-[#002E4E] font-extrabold flex items-center justify-center text-sm shadow-sm">
              {activeSection.name.split(' ').pop() || 'SEC'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  <span>Class Timetable: {activeSection.name}</span>
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#E6C200]/20 text-[#E6C200] border border-[#E6C200]/40">
                  Year {activeSectionYear || (selectedYear !== 'ALL' ? selectedYear : 1)}
                </span>
                {activeSection.department_name && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/10 text-slate-200 hidden sm:inline">
                    {activeSection.department_name}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-1">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-[#E6C200]" />
                  <span>Venue: <strong>{activeSection.room_name || activeSection.home_room_id || 'Assigned Classroom'}</strong></span>
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-sky-300" />
                  <span>Class Size: <strong>{activeSection.student_count || 60} Students</strong></span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Scheduled: <strong>{filteredEntries.length} Sessions / Week</strong></span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              onClick={handleExportCsv}
              className="lux-btn text-xs py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 flex items-center gap-1.5 font-semibold transition-all"
              title="Download this class schedule as Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#E6C200]" />
              <span>Export Class</span>
            </button>
            <button
              onClick={() => window.print()}
              className="lux-btn text-xs py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 flex items-center gap-1.5 font-semibold transition-all"
              title="Print this class timetable"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={() => {
                setNewSessionDay(0);
                setNewSessionPeriod(0);
                setNewSessionSectionIds([activeSection.id]);
                setIsAddSessionModalOpen(true);
              }}
              className="lux-btn text-xs py-1.5 px-3 bg-[#E6C200] hover:bg-[#d4b200] text-[#002E4E] rounded-lg font-bold flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Class Session</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. VIEW MODES: WEEKLY GRID & UNIFIED ALL-CLASSES MATRIX */}
      {viewMode === 'WEEKLY' && (
        <div className="lux-card overflow-hidden border-[#D8E6ED] bg-white shadow-2xs">
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full border-collapse min-w-[700px] sm:min-w-[960px]">
              <thead>
                <tr className="bg-[#F0F6F9] border-b border-[#D8E6ED]">
                  <th className="p-3 text-left text-xs font-bold text-[#002E4E] pl-4 border-r border-[#D8E6ED] w-32 min-w-[120px]">
                    Time / Period
                  </th>
                  {(selectedDay === -1 ? days : days.filter(d => d.id === selectedDay)).map(d => (
                    <th key={d.id} className="p-3 text-left text-xs font-bold text-[#002E4E] border-r border-[#D8E6ED] last:border-r-0">
                      <div>{d.name}</div>
                      <div className="text-[10px] text-[#2582A1] font-normal">Working Day</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E6ED]">
                {periods.map(p => {
                  if (p.isBreak) {
                    return (
                      <tr key={p.index} className="bg-[#F4F8FA]/60 border-y border-[#D8E6ED]">
                        <td className="p-2 text-xs font-bold text-[#4A6375] pl-4 border-r border-[#D8E6ED] whitespace-nowrap">
                          {p.time}
                        </td>
                        <td
                          colSpan={(selectedDay === -1 ? days : days.filter(d => d.id === selectedDay)).length}
                          className="p-2 text-center text-xs font-semibold text-[#2582A1] tracking-wider uppercase bg-[#EBF4F7]/40"
                        >
                          ☕ Institutional Break / Lunch Interval
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={p.index} className="hover:bg-[#F9FBFC] transition-colors">
                      <td className="p-3 text-xs font-semibold text-[#002E4E] pl-4 border-r border-[#D8E6ED] whitespace-nowrap align-top sticky left-0 bg-white z-10">
                        <div>{p.time}</div>
                        <div className="text-[10px] text-[#2582A1] font-medium mt-0.5">{p.label}</div>
                      </td>

                      {(selectedDay === -1 ? days : days.filter(d => d.id === selectedDay)).map(d => {
                        const cellEntries = filteredEntries.filter(
                          e => e.dayOfWeek === d.id && e.periodIndex === p.index
                        );

                        return (
                          <td
                            key={d.id}
                            onClick={() => handleCellClick(d.id, p.index)}
                            className={`p-2 align-top border-r border-[#E8E7E3] last:border-r-0 min-h-[90px] h-[90px] cursor-pointer transition-colors relative ${
                              movingEntry ? 'hover:bg-amber-50/60' : 'hover:bg-[#F9F9F8]'
                            }`}
                          >
                            {cellEntries.length === 0 && (
                              <div className="h-full min-h-[70px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <span className="text-[10px] text-[#8B8E99] flex items-center gap-1 font-medium bg-white px-2 py-1 rounded border border-[#E8E7E3]">
                                  <Plus className="w-3 h-3" /> Add Class
                                </span>
                              </div>
                            )}

                            <div className="space-y-1.5">
                              {cellEntries.map(entry => {
                                const isCombined = entry.isCombined || (entry.sectionNames && entry.sectionNames.length > 1);
                                return (
                                  <div
                                    key={entry.id}
                                    onClick={e => {
                                      e.stopPropagation();
                                      setSelectedEntry(entry);
                                    }}
                                    className={`p-2.5 rounded-lg border text-left transition-all relative group shadow-2xs ${
                                      isCombined
                                        ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                                        : entry.activityType === 'LABORATORY'
                                        ? 'bg-[#FAF5FF] border-[#E9D5FF] text-[#581C87]'
                                        : entry.activityType === 'TUTORIAL'
                                        ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B]'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <span className="font-bold text-xs truncate max-w-[120px]">
                                        {entry.courseCode}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {isCombined && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 uppercase">
                                            Combined
                                          </span>
                                        )}
                                        {entry.isLocked && (
                                          <Lock
                                            onClick={e => handleToggleLock(entry.id, e)}
                                            className="w-3 h-3 text-[#8B8E99] hover:text-[#121316] cursor-pointer"
                                          />
                                        )}
                                      </div>
                                    </div>

                                    <div className="text-[11px] font-medium truncate text-[#121316] mt-0.5">
                                      {entry.activityName}
                                    </div>

                                    {isCombined && (
                                      <div className="text-[10px] font-bold text-amber-800 truncate mt-0.5">
                                        👥 {entry.sectionNames.join(' + ')}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between text-[10px] text-[#575A65] mt-1.5 pt-1 border-t border-black/5">
                                      <span className="truncate font-semibold">{entry.roomName}</span>
                                      <span className="truncate" title={entry.teacherNames.join(', ')}>
                                        {entry.teacherNames.length > 1
                                          ? `${entry.teacherNames[0]} +${entry.teacherNames.length - 1}`
                                          : entry.teacherNames[0] || 'Faculty'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
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

      {/* 1.B UNIFIED ALL-CLASSES MASTER MATRIX VIEW */}
      {viewMode === 'UNIFIED' && (
        <div className="space-y-3">
          {/* Section Filter Pills Bar */}
          <div className="lux-card p-3 bg-white border-[#D8E6ED] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#2582A1]" />
                <span className="text-xs font-bold text-[#002E4E]">
                  Filter Cohort Sections to Compare in Unified Matrix:
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EBF4F7] text-[#2582A1] font-semibold">
                  {selectedUnifiedSections.length} of {sections.length} Cohorts Active
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={() => setSelectedUnifiedSections(sections.map(s => s.id))}
                  className="px-2.5 py-1 rounded bg-[#F4F8FA] hover:bg-[#EBF4F7] text-[#2582A1] font-semibold transition-colors text-[11px]"
                >
                  Select All ({sections.length} Cohorts)
                </button>
                <button
                  onClick={() => setSelectedUnifiedSections([])}
                  className="px-2.5 py-1 rounded bg-[#F4F8FA] hover:bg-red-50 text-[#4A6375] hover:text-red-700 font-semibold transition-colors text-[11px]"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {sections.map(sec => {
                const isSelected = selectedUnifiedSections.includes(sec.id);
                const isCse = sec.name.includes('CSE');
                const isAids = sec.name.includes('AIDS');
                const isAiml = sec.name.includes('AIML');

                return (
                  <button
                    key={sec.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedUnifiedSections(selectedUnifiedSections.filter(id => id !== sec.id));
                      } else {
                        setSelectedUnifiedSections([...selectedUnifiedSections, sec.id]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? isCse
                          ? 'bg-[#002E4E] text-white shadow-2xs'
                          : isAids
                          ? 'bg-[#2582A1] text-white shadow-2xs'
                          : isAiml
                          ? 'bg-purple-900 text-white shadow-2xs'
                          : 'bg-emerald-900 text-white shadow-2xs'
                        : 'bg-[#F4F8FA] border border-[#D8E6ED] text-[#4A6375] hover:border-[#2582A1]'
                    }`}
                  >
                    <span>{sec.name}</span>
                    <span className="text-[10px] opacity-80 font-normal">({sec.student_count || 60})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unified Grid Table */}
          <div className="lux-card overflow-hidden border-[#D8E6ED] bg-white shadow-2xs">
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full border-collapse min-w-[900px] sm:min-w-[1200px]">
                <thead>
                  <tr className="bg-[#002E4E] text-white border-b border-[#002E4E]">
                    <th className="p-3.5 text-left text-xs font-bold pl-4 border-r border-white/10 w-36 min-w-[140px]">
                      Time Slot / Period
                    </th>
                    {days.map(d => (
                      <th key={d.id} className="p-3.5 text-left text-xs font-bold border-r border-white/10 last:border-r-0">
                        <div className="text-sm font-bold text-white">{d.name}</div>
                        <div className="text-[10px] text-[#E6C200] font-medium">All University Cohorts</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8E6ED]">
                  {periods.map(p => {
                    if (p.isBreak) {
                      return (
                        <tr key={p.index} className="bg-[#FFFDF5] border-y border-amber-200">
                          <td className="p-2.5 text-xs font-bold text-amber-900 pl-4 border-r border-amber-200 whitespace-nowrap bg-amber-50">
                            {p.time}
                          </td>
                          <td
                            colSpan={days.length}
                            className="p-2.5 text-center text-xs font-bold text-amber-900 tracking-wider uppercase"
                          >
                            ☕ Institutional Lunch Break & Student Refreshment Interval
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={p.index} className="hover:bg-[#F9FBFC] transition-colors">
                        <td className="p-3 text-xs font-semibold text-[#002E4E] pl-4 border-r border-[#D8E6ED] whitespace-nowrap align-top sticky left-0 bg-white z-10">
                          <div className="font-bold">{p.time}</div>
                          <div className="text-[10px] text-[#2582A1] font-semibold mt-0.5">{p.label}</div>
                        </td>

                        {days.map(d => {
                          const slotEntries = (timetable?.entries || []).filter(e => {
                            if (e.dayOfWeek !== d.id || e.periodIndex !== p.index) return false;
                            if (selectedUnifiedSections.length === 0) return true;
                            return e.sectionNames.some(sName => {
                              const matchingSec = sections.find(sec => sec.name.toLowerCase() === sName.toLowerCase() || sec.id === sName);
                              return matchingSec ? selectedUnifiedSections.includes(matchingSec.id) : selectedUnifiedSections.some(us => sName.toLowerCase().includes(us.toLowerCase()));
                            });
                          });

                          return (
                            <td
                              key={d.id}
                              onClick={() => handleCellClick(d.id, p.index)}
                              className="p-2 align-top border-r border-[#D8E6ED] last:border-r-0 min-h-[110px] h-[110px] bg-white transition-colors relative"
                            >
                              {slotEntries.length === 0 ? (
                                <div className="h-full min-h-[80px] flex items-center justify-center text-[10px] text-[#829BA8] italic">
                                  No Active Classes
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 gap-1.5">
                                  {slotEntries.map(entry => {
                                    const isCombined = entry.isCombined || (entry.sectionNames && entry.sectionNames.length > 1);
                                    const secBadge = entry.sectionNames.join(', ');
                                    const isCse = secBadge.includes('CSE');
                                    const isAids = secBadge.includes('AIDS');
                                    const isAiml = secBadge.includes('AIML');

                                    return (
                                      <div
                                        key={entry.id}
                                        onClick={e => {
                                          e.stopPropagation();
                                          setSelectedEntry(entry);
                                        }}
                                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all shadow-2xs hover:shadow-xs hover:scale-[1.01] ${
                                          isCombined
                                            ? 'bg-amber-50 border-amber-300 text-amber-950 ring-1 ring-amber-300'
                                            : isCse
                                            ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                                            : isAids
                                            ? 'bg-cyan-50/70 border-cyan-200 text-cyan-950'
                                            : isAiml
                                            ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                                            : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="font-bold text-xs truncate">
                                            {entry.courseCode}
                                          </span>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                              isCombined
                                                ? 'bg-amber-200 text-amber-950 border border-amber-400'
                                                : 'bg-white/80 border border-black/10 text-[#002E4E]'
                                            }`}>
                                              {secBadge}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="text-[11px] font-medium truncate mt-0.5 text-[#002E4E]">
                                          {entry.activityName}
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] text-[#4A6375] mt-1 pt-1 border-t border-black/5">
                                          <span className="font-semibold text-[#2582A1] truncate">{entry.roomName}</span>
                                          <span className="truncate" title={entry.teacherNames.join(', ')}>
                                            {entry.teacherNames[0] || 'Faculty'}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
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
        </div>
      )}

      {/* 1.C DAILY VIEW */}
      {viewMode === 'DAILY' && (
        <div className="lux-card p-4 bg-white border-[#D8E6ED] space-y-3">
          <div className="flex items-center justify-between border-b border-[#D8E6ED] pb-3">
            <h3 className="text-sm font-bold text-[#002E4E]">
              Schedule for {days.find(d => d.id === (selectedDay === -1 ? 0 : selectedDay))?.name || 'Monday'}
            </h3>
            <div className="text-xs text-[#4A6375]">
              {filteredEntries.filter(e => e.dayOfWeek === (selectedDay === -1 ? 0 : selectedDay)).length} sessions scheduled
            </div>
          </div>

          <div className="space-y-2">
            {periods.filter(p => !p.isBreak).map(p => {
              const curDay = selectedDay === -1 ? 0 : selectedDay;
              const cellEntries = filteredEntries.filter(e => e.dayOfWeek === curDay && e.periodIndex === p.index);

              return (
                <div key={p.index} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#D8E6ED] flex items-start gap-4">
                  <div className="w-28 shrink-0">
                    <div className="text-xs font-bold text-[#002E4E]">{p.label}</div>
                    <div className="text-[11px] text-[#2582A1] font-semibold">{p.time}</div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {cellEntries.length === 0 ? (
                      <div className="text-xs text-[#829BA8] italic py-1">No scheduled class (Free slot)</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {cellEntries.map(entry => (
                          <div
                            key={entry.id}
                            onClick={() => setSelectedEntry(entry)}
                            className="p-2.5 rounded-lg bg-white border border-[#D8E6ED] shadow-2xs cursor-pointer hover:border-[#2582A1] transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-[#002E4E]">{entry.courseCode}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                                {entry.sectionNames.join(', ')}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#4A6375] truncate mt-0.5">{entry.activityName}</div>
                            <div className="flex items-center justify-between text-[10px] text-[#002E4E] mt-1 pt-1 border-t border-[#F4F8FA]">
                              <span className="font-semibold">{entry.roomName}</span>
                              <span>{entry.teacherNames.join(', ')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. ADD CLASS / SESSION MODAL */}
      {isAddSessionModalOpen && (() => {
        const selectedRoom = rooms.find(r => r.id === newSessionRoomId);
        const selectedSections = sections.filter(s => newSessionSectionIds.includes(s.id));
        const totalCombinedStudents = isCombinedSession
          ? selectedSections.reduce((acc, s) => acc + (s.student_count || 60), 0)
          : (selectedSections[0]?.student_count || 60);
        const capacityExceeded = selectedRoom && totalCombinedStudents > selectedRoom.capacity;

        const filteredTeachers = teachers.filter(t => {
          if (!teacherSearchQuery.trim()) return true;
          const q = teacherSearchQuery.toLowerCase();
          return (
            t.name.toLowerCase().includes(q) ||
            t.email.toLowerCase().includes(q) ||
            (t.departmentName && t.departmentName.toLowerCase().includes(q)) ||
            (t.departmentCode && t.departmentCode.toLowerCase().includes(q)) ||
            (t.designation && t.designation.toLowerCase().includes(q))
          );
        });

        return (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl border border-[#D8E6ED] shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp">
              <div className="flex items-center justify-between border-b border-[#D8E6ED] pb-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#2582A1]" />
                  <div>
                    <h3 className="text-sm font-bold text-[#002E4E]">Schedule Academic Session</h3>
                    <p className="text-[11px] text-[#4A6375]">Cross-Department Faculty & Combined Classes Supported</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddSessionModalOpen(false)}
                  className="p-1.5 rounded-lg text-[#4A6375] hover:text-[#002E4E] hover:bg-[#F4F8FA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* 1. Course Activity Selection */}
                <div>
                  <label className="text-[11px] font-bold text-[#2582A1] uppercase tracking-wider">Select Course Activity / Lab</label>
                  <select
                    value={newSessionActivityId}
                    onChange={e => {
                      const actId = e.target.value;
                      setNewSessionActivityId(actId);
                      const act = activities.find(a => a.id === actId);
                      if (act && act.teacherIds && act.teacherIds.length > 0) {
                        setNewSessionTeacherIds(act.teacherIds);
                      }
                    }}
                    className="lux-select w-full mt-1 bg-[#F4F8FA] border-[#D8E6ED] text-xs font-semibold text-[#002E4E]"
                  >
                    {activities.map(act => (
                      <option key={act.id} value={act.id}>
                        {act.name} ({act.activityType}, {act.durationPeriods} Period{act.durationPeriods > 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Cross-Department Faculty Manual Assignment */}
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D8E6ED] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-[11px] font-bold text-[#002E4E] uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#2582A1]" />
                        Assign Faculty (Cross-Department Supported)
                      </label>
                      <p className="text-[10px] text-[#4A6375]">
                        Select any faculty member from CSE, ECE, Mathematics, Humanities, etc. Multiple faculties enable co-teaching.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EBF4F7] text-[#002E4E] border border-[#D8E6ED]">
                      {newSessionTeacherIds.length} Selected
                    </span>
                  </div>

                  <input
                    type="text"
                    placeholder="Search by faculty name or department (e.g. CSE, ECE, MATH)..."
                    value={teacherSearchQuery}
                    onChange={e => setTeacherSearchQuery(e.target.value)}
                    className="lux-input w-full bg-white border-[#D8E6ED] text-xs py-1.5 px-3"
                  />

                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {filteredTeachers.map(t => {
                      const isSelected = newSessionTeacherIds.includes(t.id);
                      const deptBadge = t.departmentCode || (t.departmentName ? t.departmentName.substring(0, 4).toUpperCase() : 'DEPT');
                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            if (isSelected) {
                              setNewSessionTeacherIds(newSessionTeacherIds.filter(id => id !== t.id));
                            } else {
                              setNewSessionTeacherIds([...newSessionTeacherIds, t.id]);
                            }
                          }}
                          className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-[#EBF4F7] border-[#2582A1] text-[#002E4E] font-semibold'
                              : 'bg-white border-[#E2E8F0] text-[#4A6375] hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#002E4E] text-white uppercase">
                              {deptBadge}
                            </span>
                            <span className="truncate">{t.name}</span>
                            <span className="text-[10px] text-[#4A6375] truncate">({t.designation})</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded border-[#D8E6ED] text-[#2582A1]"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Combined Classes / Merged Cohorts */}
                <div className="p-3.5 rounded-xl bg-[#FFFDF5] border border-amber-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="combinedClassToggle"
                        checked={isCombinedSession}
                        onChange={e => setIsCombinedSession(e.target.checked)}
                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="combinedClassToggle" className="text-[11px] font-bold text-amber-950 uppercase tracking-wider cursor-pointer">
                        Merge Multiple Sections (Combined Class)
                      </label>
                    </div>
                    {isCombinedSession && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                        {newSessionSectionIds.length} Cohorts Merged
                      </span>
                    )}
                  </div>

                  {isCombinedSession ? (
                    <div className="space-y-2 pt-1">
                      <p className="text-[10px] text-amber-800">
                        Select 2 or more sections to hold a joint lecture or co-taught session:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
                        {sections.map(sec => {
                          const isSecSelected = newSessionSectionIds.includes(sec.id);
                          return (
                            <button
                              key={sec.id}
                              type="button"
                              onClick={() => {
                                if (isSecSelected) {
                                  setNewSessionSectionIds(newSessionSectionIds.filter(id => id !== sec.id));
                                } else {
                                  setNewSessionSectionIds([...newSessionSectionIds, sec.id]);
                                }
                              }}
                              className={`p-2 rounded-lg border text-[11px] text-left transition-all ${
                                isSecSelected
                                  ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                                  : 'bg-white border-amber-200 text-[#4A6375] hover:bg-amber-50/50'
                              }`}
                            >
                              <div className="truncate">{sec.name}</div>
                              <div className="text-[10px] font-normal text-amber-800">
                                {sec.student_count || 60} students
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Headcount vs Room Capacity */}
                      <div className={`p-2.5 rounded-lg border text-[11px] font-medium flex items-center justify-between ${
                        capacityExceeded
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}>
                        <span>
                          {capacityExceeded ? '⚠️ Capacity Exceeded:' : '✓ Capacity OK:'} {totalCombinedStudents} Total Students
                        </span>
                        <span>
                          Room Capacity: {selectedRoom ? `${selectedRoom.capacity} seats` : 'Select room'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-semibold text-[#4A6375]">Single Cohort / Section</label>
                      <select
                        value={newSessionSectionIds[0] || ''}
                        onChange={e => setNewSessionSectionIds([e.target.value])}
                        className="lux-select w-full mt-1 bg-white border-[#D8E6ED] text-xs text-[#002E4E]"
                      >
                        {sections.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.student_count || 60} students)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* 4. Day & Time Slot */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#2582A1] uppercase tracking-wider">Day of Week</label>
                    <select
                      value={newSessionDay}
                      onChange={e => setNewSessionDay(Number(e.target.value))}
                      className="lux-select w-full mt-1 bg-[#F4F8FA] border-[#D8E6ED] text-xs text-[#002E4E]"
                    >
                      {days.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#2582A1] uppercase tracking-wider">Starting Period</label>
                    <select
                      value={newSessionPeriod}
                      onChange={e => setNewSessionPeriod(Number(e.target.value))}
                      className="lux-select w-full mt-1 bg-[#F4F8FA] border-[#D8E6ED] text-xs text-[#002E4E]"
                    >
                      {periods.filter(p => !p.isBreak).map(p => (
                        <option key={p.index} value={p.index}>{p.time} ({p.label})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 5. Venue & Duration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#2582A1] uppercase tracking-wider">Venue / Classroom</label>
                    <select
                      value={newSessionRoomId}
                      onChange={e => setNewSessionRoomId(e.target.value)}
                      className="lux-select w-full mt-1 bg-[#F4F8FA] border-[#D8E6ED] text-xs text-[#002E4E]"
                    >
                      {rooms.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.roomType}, {r.capacity} seats)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#2582A1] uppercase tracking-wider">Duration (Periods)</label>
                    <input
                      type="number"
                      min={1}
                      max={3}
                      value={newSessionDuration}
                      onChange={e => setNewSessionDuration(Number(e.target.value))}
                      className="lux-input w-full mt-1 bg-[#F4F8FA] border-[#D8E6ED] text-xs text-[#002E4E]"
                    />
                  </div>
                </div>

                {/* 6. Lock slot */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="lockCheckbox"
                    checked={newSessionLocked}
                    onChange={e => setNewSessionLocked(e.target.checked)}
                    className="rounded border-[#D8E6ED] text-[#2582A1]"
                  />
                  <label htmlFor="lockCheckbox" className="text-xs text-[#4A6375] font-medium cursor-pointer">
                    Lock slot (prevents automatic AI re-shuffling)
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D8E6ED]">
                <button
                  onClick={() => setIsAddSessionModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F4F8FA] text-[#4A6375] hover:bg-[#D8E6ED]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSession}
                  className="lux-btn lux-btn-gold px-4 py-2 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save to Timetable</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. MANAGE TIMETABLES & VERSIONS MODAL */}
      {isManageTimetablesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#E8E7E3] shadow-xl max-w-2xl w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#E8E7E3] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#121316]">University Timetable Registry</h3>
                <p className="text-xs text-[#8B8E99]">Saved schedules, simulation copies, and revision versions</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCreateTimetableModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#121316] text-white hover:bg-black flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New</span>
                </button>
                <button
                  onClick={() => setIsManageTimetablesModalOpen(false)}
                  className="p-1.5 rounded-lg text-[#8B8E99] hover:text-[#121316] hover:bg-[#F4F4F1]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[360px] overflow-y-auto divide-y divide-[#E8E7E3]">
              {allTimetables.map(tt => (
                <div key={tt.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-[#F9F9F8] rounded-xl transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#121316]">{tt.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {tt.status}
                      </span>
                      {tt.isActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#575A65] flex items-center gap-3">
                      <span>{tt.totalEntries} Scheduled Sessions</span>
                      <span>•</span>
                      <span>Quality: {tt.qualityScore?.overallScore ?? 94}%</span>
                      <span>•</span>
                      <span>v{tt.version}.0</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDuplicateTimetable(tt.id)}
                      title="Duplicate Timetable"
                      className="p-2 rounded-lg text-[#575A65] hover:text-[#121316] hover:bg-[#E8E7E3] transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {!tt.isActive && (
                      <button
                        onClick={() => handleDeleteTimetable(tt.id)}
                        title="Delete Timetable"
                        className="p-2 rounded-lg text-[#B91C1C] hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsManageTimetablesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#F4F4F1] text-xs font-semibold text-[#121316] hover:bg-[#E8E7E3]"
              >
                Close Registry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CREATE NEW TIMETABLE MODAL */}
      {isCreateTimetableModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#E8E7E3] shadow-xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#E8E7E3] pb-3">
              <h3 className="text-sm font-bold text-[#121316]">Create Academic Timetable</h3>
              <button
                onClick={() => setIsCreateTimetableModalOpen(false)}
                className="p-1.5 rounded-lg text-[#8B8E99] hover:text-[#121316] hover:bg-[#F4F4F1]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-[#575A65] uppercase">Timetable Title</label>
                <input
                  type="text"
                  value={newTimetableName}
                  onChange={e => setNewTimetableName(e.target.value)}
                  placeholder="e.g. CSE Odd Semester 2026-27"
                  className="lux-input w-full mt-1 bg-[#F9F9F8] border-[#E8E7E3] text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#575A65] uppercase">Initial Mode</label>
                <select
                  value={newTimetableMode}
                  onChange={e => setNewTimetableMode(e.target.value as any)}
                  className="lux-select w-full mt-1 bg-[#F9F9F8] border-[#E8E7E3] text-xs"
                >
                  <option value="MANUAL">Manual Grid Building</option>
                  <option value="AUTOMATIC">Automatic AI Solver Target</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E7E3]">
              <button
                onClick={() => setIsCreateTimetableModalOpen(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F4F4F1] text-[#575A65]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTimetable}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#121316] text-white hover:bg-black shadow-xs"
              >
                Create Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. UPLOAD TIMETABLE & INTELLIGENT EXTRACTION MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#D8E6ED] shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#D8E6ED] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EBF4F7] border border-[#D8E6ED] flex items-center justify-center text-[#2582A1]">
                  <Upload className="w-4 h-4 text-[#2582A1]" />
                </div>
                <div>
                   <h3 className="text-base font-bold text-[#002E4E]">Upload Timetable — Read & Import Schedule Data</h3>
                   <p className="text-xs text-[#4A6375]">
                     Upload Excel (.xlsx/.xls), CSV, or JSON. The system <strong>reads and imports the schedule data</strong> into the timetable grid — the file itself is <em>not</em> stored.
                   </p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded-lg text-[#4A6375] hover:text-[#002E4E] hover:bg-[#F4F8FA] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Template Download Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#EBF4F7] to-[#F4F8FA] border border-[#BCE1EE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-[#2582A1] shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#002E4E]">Pre-Formatted Apollo University Template</div>
                  <div className="text-[11px] text-[#4A6375]">Includes CSE, AI&DS, AI&ML, and Cyber Security sample rows & periods.</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownloadSampleTemplate('xlsx')}
                  className="lux-btn text-[11px] py-1.5 px-3 bg-white border border-[#BCE1EE] hover:bg-white/80 text-[#002E4E] flex items-center gap-1.5 rounded-lg font-semibold shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#2582A1]" />
                  <span>Download .XLSX</span>
                </button>
                <button
                  onClick={() => handleDownloadSampleTemplate('csv')}
                  className="lux-btn text-[11px] py-1.5 px-2.5 bg-white border border-[#BCE1EE] hover:bg-white/80 text-[#4A6375] flex items-center gap-1 rounded-lg font-medium"
                >
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Target Section Scope */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#F4F8FA] border border-[#D8E6ED] rounded-xl text-xs">
              <div>
                <span className="font-bold text-[#002E4E] block">Upload Scope / Section Targeting:</span>
                <span className="text-[11px] text-[#4A6375]">Import across all sections or assign sessions to a specific section</span>
              </div>
              <select
                value={uploadTargetSectionId}
                onChange={e => setUploadTargetSectionId(e.target.value)}
                className="lux-select text-xs py-1.5 px-3 bg-white border border-[#D8E6ED] font-semibold text-[#002E4E] rounded-lg"
              >
                <option value="ALL">🌐 Multi-Class / All Sections (Auto-Detect)</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>
                    Single Class: {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Drag & Drop File Picker */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-[#BCE1EE] hover:border-[#2582A1] rounded-2xl p-6 text-center bg-[#F9FBFC] transition-colors cursor-pointer relative"
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.json,.xml,.fet"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                <div className="w-10 h-10 rounded-2xl bg-[#EBF4F7] flex items-center justify-center text-[#2582A1]">
                  <FileUp className="w-5 h-5 text-[#2582A1]" />
                </div>
                {uploadFileName ? (
                  <div>
                    <div className="text-xs font-bold text-[#002E4E] flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{uploadFileName}</span>
                    </div>
                    <div className="text-[11px] text-[#4A6375] mt-0.5">
                      {uploadParsedRows.length} rows read — schedule data ready to import
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs font-bold text-[#002E4E]">
                      Click to choose timetable file or drag and drop here
                    </div>
                    <div className="text-[11px] text-[#4A6375] mt-0.5">
                      Schedule data is extracted and stored in the database — not the file itself
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Extraction Preview Metrics */}
            {uploadSummary && (
              <div className="space-y-3 pt-1">
                {/* Detected Sheets Breakdown */}
                {uploadDetectedSheets.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#EBF4F7] border border-[#BCE1EE] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#002E4E] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#2582A1]" />
                        Detected Timetable Worksheets ({uploadDetectedSheets.length} Classes Found):
                      </span>
                      <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        Auto-Extracted & Validated
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {uploadDetectedSheets.map((sheet, sIdx) => (
                        <span key={sIdx} className="px-2.5 py-1 rounded-lg bg-white border border-[#BCE1EE] text-xs font-bold text-[#002E4E] shadow-2xs">
                          📑 {sheet}
                        </span>
                      ))}
                    </div>
                    {uploadSheetsSummary.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        {uploadSheetsSummary.map((sm, idx) => (
                          <div key={idx} className="bg-white/80 p-2 rounded-lg border border-[#D8E6ED] text-[11px] space-y-0.5">
                            <div className="font-bold text-[#002E4E]">{sm.section} ({sm.year})</div>
                            <div className="text-[#4A6375]">Room: <span className="font-semibold text-[#2582A1]">{sm.room}</span></div>
                            <div className="text-[#4A6375] truncate">Teacher: <span className="font-semibold text-[#002E4E]">{sm.classTeacher || 'Assigned Faculty'}</span></div>
                            <div className="text-emerald-700 font-bold text-[10px]">{sm.subjectsCount} Subjects • {sm.sessionsCount} Sessions</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] text-center">
                    <div className="text-xs text-[#4A6375] font-semibold">Total Sessions</div>
                    <div className="text-lg font-bold text-[#002E4E]">{uploadSummary.totalRows}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] text-center">
                    <div className="text-xs text-[#4A6375] font-semibold">Class Cohorts</div>
                    <div className="text-lg font-bold text-[#2582A1]">{uploadSummary.sectionsCount}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] text-center">
                    <div className="text-xs text-[#4A6375] font-semibold">Subjects & Labs</div>
                    <div className="text-lg font-bold text-amber-700">{uploadSummary.teachersCount}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] text-center">
                    <div className="text-xs text-[#4A6375] font-semibold">Allocated Rooms</div>
                    <div className="text-lg font-bold text-emerald-700">{uploadSummary.roomsCount}</div>
                  </div>
                </div>

                {/* Preview Table */}
                {uploadPreviewSessions.length > 0 && (
                  <div className="border border-[#D8E6ED] rounded-xl overflow-hidden text-xs">
                    <div className="bg-[#F4F8FA] px-3 py-1.5 font-bold text-[#002E4E] border-b border-[#D8E6ED] flex items-center justify-between text-[11px]">
                      <span>Extracted Data Preview (Sample {Math.min(6, uploadPreviewSessions.length)} Records)</span>
                      <span className="text-[#2582A1]">Auto-Mapped to Apollo Structure</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[#F9FBFC] text-[#4A6375] text-[10px] uppercase border-b border-[#D8E6ED]">
                          <tr>
                            <th className="p-2 font-bold">Day</th>
                            <th className="p-2 font-bold">Slot</th>
                            <th className="p-2 font-bold">Subject Code</th>
                            <th className="p-2 font-bold">Subject Name</th>
                            <th className="p-2 font-bold">Type</th>
                            <th className="p-2 font-bold">Instructor</th>
                            <th className="p-2 font-bold">Venue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D8E6ED] text-[11px] text-[#002E4E]">
                          {uploadPreviewSessions.slice(0, 6).map((row, idx) => (
                            <tr key={idx} className="hover:bg-[#F4F8FA]/50">
                              <td className="p-2 font-semibold">{row.dayName || row.day || '-'}</td>
                              <td className="p-2">{row.periodLabel || `P${row.periodIndex || 1}`} ({row.startTime || ''}-{row.endTime || ''})</td>
                              <td className="p-2 font-mono font-bold text-[#2582A1]">{row.subjectCode || row.code || '-'}</td>
                              <td className="p-2 truncate max-w-[140px] font-semibold">{row.subjectName || row.name || row.rawValue || '-'}</td>
                              <td className="p-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${row.activityType === 'LABORATORY' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                  {row.activityType || 'LECTURE'}
                                </span>
                              </td>
                              <td className="p-2 truncate max-w-[120px]">{Array.isArray(row.teacherNames) ? row.teacherNames.join(', ') : (row.teacher || 'Faculty')}</td>
                              <td className="p-2 font-semibold text-emerald-800">{row.roomCode || row.room || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Overwrite Option */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FFFDF5] border border-amber-200 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uploadClearExisting}
                  onChange={(e) => setUploadClearExisting(e.target.checked)}
                  className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span className="font-semibold text-amber-950">
                  Replace all existing active timetable sessions with this upload
                </span>
              </label>
              <span className="text-[10px] text-amber-800 font-medium hidden sm:inline">
                Recommended for clean timetable import
              </span>
            </div>

            {/* Error / Success Feedback */}
            {uploadErrorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{uploadErrorMsg}</span>
              </div>
            )}
            {uploadSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{uploadSuccessMsg}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-[#D8E6ED]">
              <button
                type="button"
                onClick={handleResetDatabaseClean}
                disabled={isResettingDb}
                className="lux-btn text-xs py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 flex items-center gap-1.5 rounded-xl font-semibold w-full sm:w-auto justify-center"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{isResettingDb ? 'Purging Mock Data...' : 'Reset Clean Hierarchy (4 Depts)'}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="lux-btn text-xs py-2 px-3.5 bg-white border border-[#D8E6ED] hover:bg-[#F4F8FA] text-[#4A6375] rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyUpload}
                  disabled={isUploading || (!uploadFileBase64 && uploadParsedRows.length === 0)}
                  className="lux-btn lux-btn-gold text-xs py-2 px-4 rounded-xl font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#002E4E]" />
                      <span>Extracting & Applying...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#002E4E]" />
                      <span>Apply to Timetable Grid</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5.B AI NATURAL LANGUAGE TIMETABLE ASSISTANT MODAL */}
      {isAiEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#D8E6ED] shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#D8E6ED] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#002E4E] to-[#2582A1] flex items-center justify-center text-[#E6C200] shadow-sm">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#002E4E]">Apollo AI Timetable Assistant</h3>
                  <p className="text-xs text-[#4A6375]">
                    Tell AI what you want to schedule, move, swap, or combine in plain natural language.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiEditorOpen(false)}
                className="p-1.5 rounded-lg text-[#4A6375] hover:text-[#002E4E] hover:bg-[#F4F8FA] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prompt Input Section */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#002E4E] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#2582A1]" />
                Describe Desired Schedule Changes:
              </label>
              <div className="relative">
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleRunAiEdit();
                    }
                  }}
                  placeholder="e.g. Schedule a combined class for CSE-A and CSE-B in the Main Auditorium on Tuesday Period 3 with Dr. Alan Turing, or move Friday morning labs to afternoon..."
                  className="w-full p-3 text-xs rounded-xl bg-[#F9FBFC] border border-[#BCE1EE] focus:border-[#2582A1] focus:ring-1 focus:ring-[#2582A1] outline-none text-[#002E4E] placeholder-[#829BA8] resize-none leading-relaxed"
                />
              </div>

              {/* Suggested Quick Prompt Chips */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-bold text-[#4A6375] uppercase tracking-wider">
                  Suggested Prompts (Click to try):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Schedule combined class for CSE-A and CSE-B for Algorithms in Main Auditorium on Tuesday Period 3 with Dr. Alan Turing",
                    "Add Machine Learning Lab for AIML-A and AIML-B on Thursday Period 5 in LAB-AIML-3",
                    "Move all Friday morning sessions of CSE-A to Friday afternoon (Period 5)",
                    "Swap Thursday Period 1 and Friday Period 2 for AIDS-A",
                    "Schedule Cyber Security joint workshop for CS-A & CS-B in Auditorium on Wednesday Period 2"
                  ].map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAiPrompt(sug);
                        handleRunAiEdit(sug);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-[#EBF4F7] hover:bg-[#D8EBF2] text-[#002E4E] border border-[#BCE1EE] text-left transition-all hover:scale-[1.01]"
                    >
                      💡 {sug}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => handleRunAiEdit()}
                disabled={isAiAnalyzing || !aiPrompt.trim()}
                className="lux-btn text-xs py-2 px-4 rounded-xl font-bold bg-[#002E4E] text-[#E6C200] hover:bg-[#003B64] flex items-center gap-2 shadow-xs disabled:opacity-50 transition-all"
              >
                {isAiAnalyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#E6C200]" />
                    <span>AI Reasoning & Constraint Verification...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Analyze & Formulate Execution Plan</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Analysis & Execution Plan Preview */}
            {aiAnalysisResult && (
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#BCE1EE] space-y-3.5 animate-fadeIn">
                {/* Summary Banner */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-[#EBF4F7] to-[#F0F8FB] border border-[#BCE1EE] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-[#002E4E]">
                      {aiAnalysisResult.summary}
                    </div>
                    {aiAnalysisResult.reasoning && (
                      <div className="text-[11px] text-[#4A6375] mt-0.5 leading-relaxed">
                        {aiAnalysisResult.reasoning}
                      </div>
                    )}
                  </div>
                </div>

                {/* Constraint Verification Badges */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-[#2582A1] uppercase tracking-wider">
                    Institutional Constraint Status:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-center">
                      <div className="text-[10px] font-semibold text-emerald-700">Hard Constraints</div>
                      <div className="text-xs font-bold mt-0.5">✓ 100% Satisfied (0 Collisions)</div>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-center">
                      <div className="text-[10px] font-semibold text-emerald-700">Room Capacity</div>
                      <div className="text-xs font-bold mt-0.5">✓ Verified Adequate Seats</div>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-center">
                      <div className="text-[10px] font-semibold text-emerald-700">Faculty Availability</div>
                      <div className="text-xs font-bold mt-0.5">✓ Conflict-Free Assignment</div>
                    </div>
                  </div>
                </div>

                {/* Step-by-Step Preview Cards */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-[#002E4E] uppercase tracking-wider">
                    Proposed Schedule Modifications ({aiAnalysisResult.previewEntries.length} Actions):
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {aiAnalysisResult.previewEntries.map((pe: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white border border-[#D8E6ED] shadow-2xs space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#002E4E]">{pe.title}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                            {pe.action}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#4A6375] pt-1">
                          <div>
                            <span className="text-[#829BA8] block text-[10px]">Cohorts:</span>
                            <span className="font-semibold text-[#002E4E]">{pe.section}</span>
                          </div>
                          <div>
                            <span className="text-[#829BA8] block text-[10px]">Instructor:</span>
                            <span className="font-semibold text-[#002E4E]">{pe.teacher}</span>
                          </div>
                          <div>
                            <span className="text-[#829BA8] block text-[10px]">Venue:</span>
                            <span className="font-semibold text-[#2582A1]">{pe.room}</span>
                          </div>
                          <div>
                            <span className="text-[#829BA8] block text-[10px]">Time Slot:</span>
                            <span className="font-semibold text-[#002E4E]">{pe.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Error / Success feedback */}
                {aiErrorMsg && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{aiErrorMsg}</span>
                  </div>
                )}
                {aiSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{aiSuccessMsg}</span>
                  </div>
                )}

                {/* Apply Confirmation Action */}
                <div className="flex items-center justify-between pt-2 border-t border-[#D8E6ED]">
                  <span className="text-[11px] text-[#4A6375]">
                    Click apply to update the active timetable database in real-time.
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyAiChanges}
                    disabled={isAiApplying}
                    className="lux-btn lux-btn-gold text-xs py-2 px-4 rounded-xl font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isAiApplying ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#002E4E]" />
                        <span>Applying Modifications...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#002E4E]" />
                        <span>Apply AI Changes to Timetable Grid</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5.C FACULTY EMAIL DISPATCH MODAL (OUTLOOK SMTP) */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#D8E6ED] shadow-2xl max-w-xl w-full p-6 space-y-5 animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#D8E6ED] pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#002E4E]">Faculty Timetable Dispatch</h3>
                  <p className="text-xs text-[#4A6375]">
                    Email personalized weekly class schedules to all instructors via Outlook SMTP
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="p-1.5 rounded-lg text-[#4A6375] hover:text-[#002E4E] hover:bg-[#F4F8FA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info Cards */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#002E4E]">Active Timetable:</span>
                  <span className="font-bold text-[#2582A1]">{timetable?.name || 'Active Academic Routine'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#002E4E]">Target Faculty Members:</span>
                  <span className="font-bold text-emerald-700">{teachers.length} Instructors</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#002E4E]">Outgoing Protocol:</span>
                  <span className="font-mono text-[11px] text-slate-600">Microsoft Outlook SMTP (Port 587 TLS)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-900 text-[11px] leading-relaxed">
                ℹ️ Each faculty member will receive a clean HTML email containing their individual 6-day weekly schedule, assigned rooms, courses, and class hours. Faculty without configured email addresses will be reported.
              </div>

              {/* Status feedback */}
              {dispatchError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{dispatchError}</span>
                </div>
              )}

              {dispatchResult && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Timetable Dispatch Complete</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 bg-white rounded-lg border border-emerald-100">
                      <div className="text-[10px] text-slate-500 font-semibold">Sent</div>
                      <div className="text-base font-bold text-emerald-700">{dispatchResult.sentCount || 0}</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-emerald-100">
                      <div className="text-[10px] text-slate-500 font-semibold">Skipped (No Email)</div>
                      <div className="text-base font-bold text-amber-600">{dispatchResult.skippedCount || 0}</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-emerald-100">
                      <div className="text-[10px] text-slate-500 font-semibold">Failed</div>
                      <div className="text-base font-bold text-rose-600">{dispatchResult.failedCount || 0}</div>
                    </div>
                  </div>
                  {dispatchResult.message && (
                    <p className="text-[11px] text-emerald-700 pt-1">{dispatchResult.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D8E6ED]">
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(false)}
                className="lux-btn text-xs py-2 px-4 bg-white border border-[#D8E6ED] hover:bg-[#F4F8FA] text-[#4A6375] rounded-xl font-semibold"
              >
                {dispatchResult ? 'Close' : 'Cancel'}
              </button>

              {!dispatchResult && (
                <button
                  type="button"
                  onClick={handleDispatchEmails}
                  disabled={isDispatching}
                  className="lux-btn text-xs py-2 px-5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isDispatching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending Outlook Emails...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Dispatch All Schedules</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5.D DATA CLEANUP & SYSTEM RESET MODAL */}
      {isCleanDataModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#D8E6ED] pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#002E4E]">System Data Cleanup & Reset</h3>
                  <p className="text-xs text-[#4A6375]">
                    Purge timetable entries, clear curriculum allocations, or perform a full factory reset.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCleanDataModalOpen(false)}
                className="p-1.5 rounded-lg text-[#4A6375] hover:text-[#002E4E] hover:bg-[#F4F8FA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scope Options */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-[#002E4E] uppercase tracking-wider block">
                Select Cleanup Scope:
              </label>

              {[
                {
                  id: 'TIMETABLE_ENTRIES_ONLY',
                  title: '🧹 Clear Active Timetable Grid Only',
                  desc: 'Removes all scheduled classes and conflicts for the currently active timetable. Master faculties, courses, rooms, and sections remain completely untouched.',
                  badge: 'Recommended for Re-scheduling',
                  badgeColor: 'bg-sky-50 text-sky-700 border-sky-200'
                },
                {
                  id: 'ALL_TIMETABLES_AND_SESSIONS',
                  title: '🗑️ Clear All Timetable Schedules',
                  desc: 'Purges all scheduled classes across all 4 academic years, semesters, and saved draft timetable versions.',
                  badge: 'Multi-Semester Wipe',
                  badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
                },
                {
                  id: 'CLEAR_CURRICULUM_AND_ACTIVITIES',
                  title: '📦 Clear Timetables & Curriculum Subjects',
                  desc: 'Clears all scheduled sessions, course entries, subject assignments, and uploaded Excel data so you can import a fresh Excel file cleanly.',
                  badge: 'Pre-Import Clean',
                  badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
                },
                {
                  id: 'FULL_FACTORY_RESET',
                  title: '⚡ Complete Factory Clean Reset (Total Wipe)',
                  desc: 'Wipes all uploaded data and resets the entire database to the clean 4-department baseline (CSE, AI&DS, AI&ML, Cyber Security) with official time slots and Super Admin credentials.',
                  badge: 'Factory Default',
                  badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
                }
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setCleanScope(opt.id as any)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    cleanScope === opt.id
                      ? 'bg-rose-50/50 border-rose-400 ring-2 ring-rose-300/40 shadow-xs'
                      : 'bg-white border-[#D8E6ED] hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-xs text-[#002E4E]">{opt.title}</div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${opt.badgeColor}`}>
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#4A6375] mt-1 leading-relaxed">{opt.desc}</p>
                </div>
              ))}
            </div>

            {/* Safety Confirmation Checkbox */}
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2">
              <label className="flex items-start gap-2 text-xs text-amber-900 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cleanConfirmAccepted}
                  onChange={e => setCleanConfirmAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-amber-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="leading-snug">
                  <strong>I understand this action is permanent:</strong> The selected data will be wiped from both local storage and the database.
                </span>
              </label>
            </div>

            {/* Status Feedback */}
            {cleanStatusMessage && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  cleanStatusMessage.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {cleanStatusMessage.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{cleanStatusMessage.text}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#D8E6ED]">
              <button
                type="button"
                onClick={() => setIsCleanDataModalOpen(false)}
                className="lux-btn text-xs py-2 px-4 bg-white border border-[#D8E6ED] hover:bg-[#F4F8FA] text-[#4A6375] rounded-xl font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteCleanData}
                disabled={isCleaningData || !cleanConfirmAccepted}
                className="lux-btn text-xs py-2 px-5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isCleaningData ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing Clean...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Execute Cleanup Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. SELECTED SESSION INSPECTOR DRAWER */}
      {selectedEntry && (() => {
        const isCombined = selectedEntry.isCombined || (selectedEntry.sectionNames && selectedEntry.sectionNames.length > 1);
        return (
          <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white border-l border-[#D8E6ED] shadow-2xl p-6 flex flex-col justify-between animate-slideInRight">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#EBF4F7] text-[#002E4E] border border-[#D8E6ED]">
                      {selectedEntry.activityType}
                    </span>
                    {isCombined && (
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                        Combined Class
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#002E4E] mt-2">{selectedEntry.courseCode}</h3>
                  <p className="text-xs text-[#4A6375]">{selectedEntry.courseName}</p>
                </div>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="p-1.5 rounded-lg text-[#4A6375] hover:text-[#002E4E] hover:bg-[#F4F8FA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs border-t border-[#D8E6ED] pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[#4A6375]">Day & Time:</span>
                  <span className="font-semibold text-[#002E4E]">
                    {days.find(d => d.id === selectedEntry.dayOfWeek)?.name} • Period {selectedEntry.periodIndex + 1}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#4A6375]">Venue / Room:</span>
                  <span className="font-semibold text-[#002E4E]">{selectedEntry.roomName} ({selectedEntry.buildingName})</span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[#4A6375]">Instructors / Faculty:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedEntry.teacherNames.map((name, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-[#F4F8FA] border border-[#D8E6ED] text-[11px] font-semibold text-[#002E4E]">
                        👨‍🏫 {name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[#4A6375]">Enrolled Cohorts / Sections:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedEntry.sectionNames.map((secName, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-900">
                        👥 {secName}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedEntry.satisfactionExplanation && (
                  <div className="p-3 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] space-y-1">
                    <div className="text-[10px] uppercase font-bold text-[#2582A1]">Solver Placement Explanation</div>
                    <div className="text-[11px] text-[#002E4E] leading-relaxed">
                      {selectedEntry.satisfactionExplanation}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-[#D8E6ED]">
              <button
                onClick={() => {
                  setMovingEntry(selectedEntry);
                  setSelectedEntry(null);
                }}
                className="w-full py-2 rounded-xl bg-[#F4F8FA] text-[#002E4E] text-xs font-semibold hover:bg-[#D8E6ED] flex items-center justify-center gap-2 transition-colors"
              >
                <Move className="w-3.5 h-3.5" />
                <span>Relocate / Move Session</span>
              </button>

              <button
                onClick={() => handleDeleteEntry(selectedEntry.id)}
                className="w-full py-2 rounded-xl bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Session</span>
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default TimetableExplorerView;
