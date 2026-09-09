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
  FileText
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
  const [viewMode, setViewMode] = useState<'WEEKLY' | 'DAILY' | 'LIST'>('WEEKLY');
  const [selectedDay, setSelectedDay] = useState<number>(0);

  // Inspector & Edit state
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);
  const [movingEntry, setMovingEntry] = useState<TimetableEntry | null>(null);
  const [conflictWarning, setConflictWarning] = useState<TimetableConflict | null>(null);

  // Modals state
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [isManageTimetablesModalOpen, setIsManageTimetablesModalOpen] = useState(false);
  const [isCreateTimetableModalOpen, setIsCreateTimetableModalOpen] = useState(false);

  // Upload Timetable state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileBase64, setUploadFileBase64] = useState('');
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
      const hier = await api.getHierarchy();
      const sList = hier?.sections || [];
      setSections(sList);
      if (sList.length > 0 && !selectedFilterId) {
        setSelectedFilterId(sList[0].id);
      }
      if (sList.length > 0 && newSessionSectionIds.length === 0) {
        setNewSessionSectionIds([sList[0].id]);
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
    { id: 4, name: 'Friday', short: 'Fri' }
  ];

  const periods = [
    { index: 0, time: '09:00 - 10:00', label: 'Period 1' },
    { index: 1, time: '10:00 - 11:00', label: 'Period 2' },
    { index: 2, time: '11:15 - 12:15', label: 'Period 3' },
    { index: 3, time: '12:15 - 13:15', label: 'Period 4' },
    { index: 4, time: '13:15 - 14:00', label: 'Lunch Break', isBreak: true },
    { index: 5, time: '14:00 - 15:00', label: 'Period 5' },
    { index: 6, time: '15:00 - 16:00', label: 'Period 6' },
    { index: 7, time: '16:00 - 17:00', label: 'Period 7' }
  ];

  // Filtering entries
  const filteredEntries = (timetable?.entries || []).filter(e => {
    if (filterType === 'ALL') return true;
    if (filterType === 'SECTION') {
      return e.sectionNames.some(s => s.toLowerCase().includes(selectedFilterId.toLowerCase())) ||
             e.groupNames.some(g => g.toLowerCase().includes(selectedFilterId.toLowerCase()));
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

  // Handle Timetable File Selection & Client-side Preview
  const handleFileSelect = (file: File) => {
    setUploadErrorMsg('');
    setUploadSuccessMsg('');
    setUploadFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) return;

        let rows: any[] = [];
        let base64Str = '';

        if (typeof buffer === 'string') {
          base64Str = btoa(unescape(encodeURIComponent(buffer)));
          if (file.name.endsWith('.json')) {
            const parsed = JSON.parse(buffer);
            rows = Array.isArray(parsed) ? parsed : (parsed.sessions || parsed.entries || [parsed]);
          } else {
            const wb = xlsx.read(buffer, { type: 'string' });
            rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
          }
        } else {
          const arrayBuffer = buffer as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          base64Str = btoa(binary);

          const wb = xlsx.read(arrayBuffer, { type: 'array' });
          rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        }

        setUploadFileBase64(base64Str);
        setUploadParsedRows(rows);

        // Calculate preview metrics
        const sectionsSet = new Set<string>();
        const teachersSet = new Set<string>();
        const roomsSet = new Set<string>();

        rows.forEach(r => {
          Object.entries(r).forEach(([k, v]) => {
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

    if (file.name.endsWith('.csv') || file.name.endsWith('.json') || file.name.endsWith('.xml') || file.name.endsWith('.fet')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
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

  const handleExportCsv = () => {
    if (!timetable || timetable.entries.length === 0) return;
    const headers = ['Day', 'Period', 'Course Code', 'Course Name', 'Type', 'Room', 'Teachers', 'Cohorts'];
    const rows = timetable.entries.map(e => [
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
    link.setAttribute('download', `${timetable.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 max-w-full">
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
                {sections.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.student_count || 60} students)
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

        {/* Right: Upload Timetable, Add Session, Manage Timetables, Export Suite */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
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
            Full Week (5 Days)
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

      {/* 1. WEEKLY GRID VIEW */}
      <div className="lux-card overflow-hidden border-[#D8E6ED] bg-white shadow-2xs">
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full border-collapse min-w-[700px] sm:min-w-[960px]">
            <thead>
              <tr className="bg-[#F0F6F9] border-b border-[#D8E6ED]">
                <th className="p-3 text-left text-xs font-bold uppercase tracking-wider text-[#2582A1] w-28 pl-4 sticky left-0 bg-[#F0F6F9] z-10 border-r border-[#D8E6ED]">
                  Time / Slot
                </th>
                {(selectedDay === -1 ? days : days.filter(d => d.id === selectedDay)).map(d => (
                  <th key={d.id} className="p-3 text-center text-xs font-bold text-[#002E4E]">
                    {d.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E7E3]">
              {periods.map(p => {
                if (p.isBreak) {
                  return (
                    <tr key={p.index} className="bg-[#F4F8FA]">
                      <td className="p-2.5 text-xs font-bold text-[#2582A1] pl-4 whitespace-nowrap sticky left-0 bg-[#F4F8FA] z-10 border-r border-[#D8E6ED]">
                        {p.time}
                      </td>
                      <td colSpan={selectedDay === -1 ? days.length : 1} className="p-2.5 text-center text-xs font-bold tracking-wider text-[#4A6375] uppercase">
                        — {p.label} (Recess) —
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
                  <h3 className="text-base font-bold text-[#002E4E]">Upload & Auto-Schedule Timetable</h3>
                  <p className="text-xs text-[#4A6375]">
                    Upload Excel (.xlsx/.xls), CSV, or JSON. The engine will extract sessions, resolve faculty & cohorts, and populate the grid.
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
                      {uploadParsedRows.length} total rows parsed from file
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs font-bold text-[#002E4E]">
                      Click to choose timetable file or drag and drop here
                    </div>
                    <div className="text-[11px] text-[#4A6375] mt-0.5">
                      Supports Excel (.xlsx, .xls), CSV, JSON, and FET XML formats
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Extraction Preview Metrics */}
            {uploadSummary && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] text-center">
                    <div className="text-xs text-[#4A6375] font-semibold">Total Sessions</div>
                    <div className="text-lg font-bold text-[#002E4E]">{uploadSummary.totalRows}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] text-center">
                    <div className="text-xs text-[#4A6375] font-semibold">Class Sections</div>
                    <div className="text-lg font-bold text-[#2582A1]">{uploadSummary.sectionsCount}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] text-center">
                    <div className="text-xs text-[#4A6375] font-semibold">Instructors</div>
                    <div className="text-lg font-bold text-amber-700">{uploadSummary.teachersCount}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F4F8FA] border border-[#D8E6ED] text-center">
                    <div className="text-xs text-[#4A6375] font-semibold">Venues / Rooms</div>
                    <div className="text-lg font-bold text-emerald-700">{uploadSummary.roomsCount}</div>
                  </div>
                </div>

                {/* Preview Table */}
                {uploadPreviewSessions.length > 0 && (
                  <div className="border border-[#D8E6ED] rounded-xl overflow-hidden text-xs">
                    <div className="bg-[#F4F8FA] px-3 py-1.5 font-bold text-[#002E4E] border-b border-[#D8E6ED] flex items-center justify-between text-[11px]">
                      <span>Extracted Data Preview (First {uploadPreviewSessions.length} records)</span>
                      <span className="text-[#2582A1]">Auto-Mapped to Apollo Structure</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[#F9FBFC] text-[#4A6375] text-[10px] uppercase border-b border-[#D8E6ED]">
                          <tr>
                            {Object.keys(uploadPreviewSessions[0]).slice(0, 6).map((k) => (
                              <th key={k} className="p-2 font-bold">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D8E6ED] text-[11px] text-[#002E4E]">
                          {uploadPreviewSessions.map((row, idx) => (
                            <tr key={idx} className="hover:bg-[#F4F8FA]/50">
                              {Object.values(row).slice(0, 6).map((val: any, cIdx) => (
                                <td key={cIdx} className="p-2 truncate max-w-[140px]">
                                  {String(val || '-')}
                                </td>
                              ))}
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
