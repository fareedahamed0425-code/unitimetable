import React, { useState, useEffect } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { api } from '../../api';
import {
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
  const [viewMode, setViewMode] = useState<'WEEKLY' | 'DAILY' | 'LIST'>('WEEKLY');
  const [selectedDay, setSelectedDay] = useState<number>(0);

  // Inspector state
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);

  // Move state
  const [movingEntry, setMovingEntry] = useState<TimetableEntry | null>(null);
  const [conflictWarning, setConflictWarning] = useState<TimetableConflict | null>(null);

  useEffect(() => {
    loadHierarchySections();
  }, []);

  const loadHierarchySections = async () => {
    try {
      const hier = await api.getHierarchy();
      const sList = hier?.sections || [];
      setSections(sList);
      if (sList.length > 0 && !selectedFilterId) {
        setSelectedFilterId(sList[0].id);
      }
    } catch (e) {
      console.error('Failed to load sections for explorer:', e);
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

  if (!timetable || timetable.entries.length === 0) {
    return (
      <div className="lux-card p-12 text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="w-10 h-10 rounded-lg bg-[#F4F4F1] text-[#121316] flex items-center justify-center mx-auto">
          <Calendar className="w-5 h-5" />
        </div>
        <h2 className="text-base font-bold text-[#121316]">No Timetable Generated Yet</h2>
        <p className="text-xs text-[#8B8E99]">
          Run the Smart Generation Wizard to solve constraints and produce the live university schedule.
        </p>
      </div>
    );
  }

  const filteredEntries = timetable.entries.filter(entry => {
    if (filterType === 'ALL' || !selectedFilterId) return true;
    if (filterType === 'SECTION') {
      return (
        entry.sectionNames.includes(selectedFilterId) ||
        entry.groupNames.some(g => g.includes(selectedFilterId)) ||
        entry.sectionNames.some(s => s.toLowerCase() === selectedFilterId.toLowerCase())
      );
    }
    if (filterType === 'TEACHER') {
      return entry.teacherIds.includes(selectedFilterId);
    }
    if (filterType === 'ROOM') {
      return entry.roomId === selectedFilterId;
    }
    return true;
  });

  const handleToggleLock = async (entry: TimetableEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.toggleLock(entry.id);
    onRefresh();
  };

  const handleSlotClick = async (day: number, period: number) => {
    if (!movingEntry) return;

    const res = await api.moveEntry({
      entryId: movingEntry.id,
      dayOfWeek: day,
      periodIndex: period
    });

    if (res.conflicts.length > 0) {
      setConflictWarning(res.conflicts[0]);
    } else {
      setConflictWarning(null);
    }

    setMovingEntry(null);
    onRefresh();
  };

  return (
    <div className="space-y-5">
      {/* Control Bar: Swiss Filter Suite & Segmented Controls */}
      <div className="lux-card p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Left: Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8B8E99] pr-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </div>

          <div className="relative">
            <select
              className="lux-select text-xs py-1.5 pl-3 pr-8 font-medium appearance-none cursor-pointer"
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
            <ChevronDown className="w-3 h-3 text-[#8B8E99] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {filterType === 'SECTION' && (
            <div className="relative">
              <select
                className="lux-select text-xs py-1.5 pl-3 pr-8 font-medium appearance-none cursor-pointer"
                value={selectedFilterId}
                onChange={e => setSelectedFilterId(e.target.value)}
              >
                {sections.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.student_count || 60} students)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[#8B8E99] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {filterType === 'TEACHER' && (
            <div className="relative">
              <select
                className="lux-select text-xs py-1.5 pl-3 pr-8 font-medium appearance-none cursor-pointer"
                value={selectedFilterId}
                onChange={e => setSelectedFilterId(e.target.value)}
              >
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.designation})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[#8B8E99] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {filterType === 'ROOM' && (
            <div className="relative">
              <select
                className="lux-select text-xs py-1.5 pl-3 pr-8 font-medium appearance-none cursor-pointer"
                value={selectedFilterId}
                onChange={e => setSelectedFilterId(e.target.value)}
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.roomType}, {r.capacity} seats)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[#8B8E99] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Right: Segmented View Controls & Print */}
        <div className="flex items-center gap-2">
          <div className="bg-[#F4F4F1] p-0.5 rounded-lg flex items-center border border-[#E8E7E3]">
            <button
              onClick={() => setViewMode('WEEKLY')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'WEEKLY' ? 'bg-white text-[#121316] shadow-xs' : 'text-[#575A65] hover:text-[#121316]'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode('DAILY')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'DAILY' ? 'bg-white text-[#121316] shadow-xs' : 'text-[#575A65] hover:text-[#121316]'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'LIST' ? 'bg-white text-[#121316] shadow-xs' : 'text-[#575A65] hover:text-[#121316]'
              }`}
            >
              List
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="lux-btn text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-[#575A65]" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Moving Mode Notice */}
      {movingEntry && (
        <div className="p-3 rounded-lg bg-[#121316] text-white text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <Move className="w-4 h-4" />
            <span>
              <strong>Relocating session:</strong> '{movingEntry.courseCode} — {movingEntry.activityName}'. Click target period on grid.
            </span>
          </div>
          <button
            onClick={() => setMovingEntry(null)}
            className="text-xs font-bold text-white/80 hover:text-white underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Conflict Warning Banner */}
      {conflictWarning && (
        <div className="p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#B91C1C] flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-[#B91C1C] flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-[#B91C1C]">{conflictWarning.title}</div>
            <div className="text-[#575A65]">{conflictWarning.description}</div>
            <div className="font-semibold text-[#121316]">Suggested Fix: {conflictWarning.suggestedFix}</div>
          </div>
        </div>
      )}

      {/* 1. WEEKLY GRID VIEW */}
      {viewMode === 'WEEKLY' && (
        <div className="lux-card overflow-hidden border-[#E8E7E3]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-[#FAF9F7] border-b border-[#E8E7E3]">
                  <th className="p-3 text-left text-xs font-bold uppercase tracking-wider text-[#8B8E99] w-28 pl-4">
                    Time / Slot
                  </th>
                  {days.map(d => (
                    <th
                      key={d.id}
                      className="p-3 text-center text-xs font-bold text-[#121316]"
                    >
                      {d.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E7E3]">
                {periods.map(p => {
                  if (p.isBreak) {
                    return (
                      <tr key={p.index} className="bg-[#F8F7F4]">
                        <td className="p-2.5 text-[11px] font-semibold text-[#575A65] pl-4 border-r border-[#E8E7E3]">
                          {p.time}
                        </td>
                        <td
                          colSpan={5}
                          className="p-2 text-center text-[11px] font-bold text-[#575A65] tracking-widest uppercase"
                        >
                          — {p.label} (Lunch & Common Period) —
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={p.index} className="h-28 hover:bg-[#FAF9F7]/60 transition-colors">
                      <td className="p-2.5 text-[11px] font-medium text-[#575A65] bg-[#FAF9F7]/80 align-top pl-4 border-r border-[#E8E7E3]">
                        <div className="font-bold text-[#121316]">{p.label}</div>
                        <div className="text-[10px] text-[#8B8E99] mt-0.5">{p.time}</div>
                      </td>

                      {days.map(d => {
                        const slotEntries = filteredEntries.filter(
                          e => e.dayOfWeek === d.id && (
                            e.periodIndex === p.index ||
                            (e.duration === 2 && e.periodIndex === p.index - 1 && p.index !== 5)
                          )
                        );

                        return (
                          <td
                            key={d.id}
                            onClick={() => handleSlotClick(d.id, p.index)}
                            className={`p-1.5 align-top border-r border-[#E8E7E3] last:border-r-0 transition-colors ${
                              movingEntry ? 'hover:bg-[#F4F4F1] cursor-pointer' : ''
                            }`}
                          >
                            <div className="space-y-1.5 min-h-[6rem]">
                              {slotEntries.map(entry => {
                                const isLab = entry.activityType === 'LABORATORY';
                                const isTutorial = entry.activityType === 'TUTORIAL';
                                const isSeminar = entry.activityType === 'SEMINAR';

                                return (
                                  <div
                                    key={entry.id}
                                    onClick={() => setSelectedEntry(entry)}
                                    className={`activity-card ${
                                      isLab
                                        ? 'type-lab'
                                        : isTutorial
                                        ? 'type-tutorial'
                                        : isSeminar
                                        ? 'type-seminar'
                                        : 'type-lecture'
                                    } ${entry.isLocked ? 'is-locked' : ''}`}
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <span className="font-bold text-xs text-[#121316]">
                                        {entry.courseCode}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={e => handleToggleLock(entry, e)}
                                          title={entry.isLocked ? 'Pinned' : 'Unlock'}
                                          className="text-[#8B8E99] hover:text-[#121316]"
                                        >
                                          {entry.isLocked ? (
                                            <Lock className="w-3 h-3 text-[#121316]" />
                                          ) : (
                                            <Unlock className="w-3 h-3 text-[#8B8E99]" />
                                          )}
                                        </button>
                                        <button
                                          onClick={e => {
                                            e.stopPropagation();
                                            setMovingEntry(entry);
                                          }}
                                          title="Move Class"
                                          className="text-[#8B8E99] hover:text-[#121316]"
                                        >
                                          <Move className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="text-[11px] font-medium text-[#575A65] truncate mt-0.5">
                                      {entry.activityName}
                                    </div>

                                    <div className="text-[10px] text-[#8B8E99] flex items-center gap-1 mt-1">
                                      <Users className="w-3 h-3 text-[#8B8E99]" />
                                      <span className="truncate">{entry.teacherNames.join(', ')}</span>
                                    </div>

                                    <div className="text-[10px] text-[#575A65] flex items-center justify-between mt-1 pt-1 border-t border-[#F0EFEA]">
                                      <span className="flex items-center gap-1 font-medium text-[#121316]">
                                        <Building className="w-3 h-3 text-[#8B8E99]" />
                                        {entry.roomName}
                                      </span>
                                      {entry.duration > 1 && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#F4F4F1] text-[#121316] border border-[#E8E7E3] rounded">
                                          {entry.duration} hrs
                                        </span>
                                      )}
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

      {/* 2. LIST VIEW */}
      {viewMode === 'LIST' && (
        <div className="lux-card p-5 space-y-3">
          <div className="text-xs font-bold text-[#8B8E99] uppercase tracking-wider mb-2">
            Scheduled Sessions ({filteredEntries.length})
          </div>
          <div className="space-y-2">
            {filteredEntries.map(entry => {
              const dayName = days[entry.dayOfWeek]?.name || 'Monday';
              const pLabel = periods.find(p => p.index === entry.periodIndex)?.time || '09:00';

              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className="p-3.5 rounded-lg border border-[#E8E7E3] bg-white hover:border-[#121316] transition-all flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#121316]">{entry.courseCode}</span>
                      <span className="text-xs text-[#575A65] font-semibold">{entry.activityName}</span>
                      <span className="badge badge-primary text-[10px]">
                        {entry.activityType}
                      </span>
                    </div>
                    <div className="text-xs text-[#8B8E99] flex items-center gap-4">
                      <span>Faculty: <strong>{entry.teacherNames.join(', ')}</strong></span>
                      <span>Venue: <strong>{entry.roomName}</strong> ({entry.buildingName})</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-[#121316]">{dayName}</div>
                    <div className="text-[11px] text-[#8B8E99]">{pLabel} ({entry.duration} hr)</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. DAILY VIEW */}
      {viewMode === 'DAILY' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {days.map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDay(d.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedDay === d.id ? 'bg-[#121316] text-white' : 'bg-white border border-[#E8E7E3] text-[#575A65]'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>

          <div className="lux-card p-5 divide-y divide-[#E8E7E3]">
            {periods.filter(p => !p.isBreak).map(p => {
              const entriesInPeriod = filteredEntries.filter(
                e => e.dayOfWeek === selectedDay && (
                  e.periodIndex === p.index || (e.duration === 2 && e.periodIndex === p.index - 1)
                )
              );

              return (
                <div key={p.index} className="py-3 flex items-start gap-6">
                  <div className="w-28 text-xs text-[#575A65] flex-shrink-0">
                    <div className="font-bold text-[#121316]">{p.label}</div>
                    <div className="text-[11px] text-[#8B8E99]">{p.time}</div>
                  </div>

                  <div className="flex-1 space-y-2">
                    {entriesInPeriod.length === 0 ? (
                      <div className="text-xs text-[#8B8E99] italic py-1">No scheduled session</div>
                    ) : (
                      entriesInPeriod.map(entry => (
                        <div
                          key={entry.id}
                          onClick={() => setSelectedEntry(entry)}
                          className="p-3 rounded-lg bg-[#FAF9F7] border border-[#E8E7E3] flex items-center justify-between cursor-pointer hover:border-[#121316] transition-all"
                        >
                          <div>
                            <div className="font-bold text-xs text-[#121316]">{entry.courseCode} — {entry.activityName}</div>
                            <div className="text-[11px] text-[#575A65] mt-0.5">Faculty: {entry.teacherNames.join(', ')} | Venue: {entry.roomName}</div>
                          </div>
                          <span className="badge badge-primary">{entry.activityType}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Specification Inspector Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="lux-modal max-w-lg w-full p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-[#F4F4F1] text-[#575A65] border border-[#E8E7E3] inline-block mb-1.5">
                  Explainable Scheduling Inspector
                </span>
                <h3 className="text-base font-bold text-[#121316]">
                  {selectedEntry.courseCode} — {selectedEntry.activityName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="w-7 h-7 rounded bg-[#F4F4F1] text-[#575A65] hover:text-[#121316] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-lg bg-[#FAF9F7] border border-[#E8E7E3] text-xs text-[#575A65] space-y-2 whitespace-pre-line leading-relaxed font-mono">
                {selectedEntry.satisfactionExplanation || 'Scheduled using constraint solver heuristic rules.'}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-[#E8E7E3] bg-white">
                  <div className="text-[#8B8E99] uppercase text-[9px] font-bold tracking-wider">Assigned Venue</div>
                  <div className="font-semibold text-[#121316] mt-0.5">{selectedEntry.roomName}</div>
                </div>
                <div className="p-3 rounded-lg border border-[#E8E7E3] bg-white">
                  <div className="text-[#8B8E99] uppercase text-[9px] font-bold tracking-wider">Assigned Faculty</div>
                  <div className="font-semibold text-[#121316] mt-0.5">{selectedEntry.teacherNames.join(', ')}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEntry(null)}
                className="lux-btn lux-btn-primary text-xs py-2 px-5"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableExplorerView;
