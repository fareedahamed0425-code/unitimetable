import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  ChevronDown
} from 'lucide-react';
import { api } from '../../api';
import { AvailabilityState, EntityAvailability, Room, Teacher, TimeSlot } from '../../../../shared/types';

export const AvailabilityMatrixView: React.FC = () => {
  const [entityType, setEntityType] = useState<'TEACHER' | 'ROOM' | 'STUDENT_SECTION'>('TEACHER');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [availabilityList, setAvailabilityList] = useState<EntityAvailability[]>([]);
  const [calendar, setCalendar] = useState<TimeSlot[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [tList, rList, cal, avList, hier] = await Promise.all([
      api.getTeachers(),
      api.getInfrastructure().then(res => res.rooms),
      api.getCalendar(),
      api.getAvailability(),
      api.getHierarchy()
    ]);
    setTeachers(tList);
    setRooms(rList);
    setCalendar(cal);
    setAvailabilityList(avList);
    const secs = hier?.sections || [];
    setSections(secs);

    if (tList.length > 0) setSelectedEntityId(tList[0].id);
    else if (rList.length > 0) setSelectedEntityId(rList[0].id);
    else if (secs.length > 0) setSelectedEntityId(secs[0].id);
  };

  const days = [
    { id: 0, name: 'Monday', short: 'Mon' },
    { id: 1, name: 'Tuesday', short: 'Tue' },
    { id: 2, name: 'Wednesday', short: 'Wed' },
    { id: 3, name: 'Thursday', short: 'Thu' },
    { id: 4, name: 'Friday', short: 'Fri' }
  ];

  const periods = [0, 1, 2, 3, 5, 6, 7];

  const getSlotState = (day: number, period: number): AvailabilityState => {
    const match = availabilityList.find(
      a => a.entityType === entityType && a.entityId === selectedEntityId && a.dayOfWeek === day && a.periodIndex === period
    );
    return match ? match.state : 'NEUTRAL';
  };

  const cycleSlotState = async (day: number, period: number) => {
    if (!selectedEntityId) return;
    const currentState = getSlotState(day, period);
    let nextState: AvailabilityState = 'NEUTRAL';

    if (currentState === 'NEUTRAL') nextState = 'UNAVAILABLE';
    else if (currentState === 'UNAVAILABLE') nextState = 'PREFERRED';
    else if (currentState === 'PREFERRED') nextState = 'STRONGLY_PREFERRED';
    else if (currentState === 'STRONGLY_PREFERRED') nextState = 'DISCOURAGED';
    else nextState = 'NEUTRAL';

    setAvailabilityList(prev => {
      const filtered = prev.filter(
        a => !(a.entityType === entityType && a.entityId === selectedEntityId && a.dayOfWeek === day && a.periodIndex === period)
      );
      if (nextState !== 'NEUTRAL') {
        filtered.push({
          entityType,
          entityId: selectedEntityId,
          dayOfWeek: day,
          periodIndex: period,
          state: nextState
        });
      }
      return filtered;
    });

    await api.toggleAvailability({
      entityType,
      entityId: selectedEntityId,
      dayOfWeek: day,
      periodIndex: period,
      state: nextState
    });
  };

  const stateColors: Record<AvailabilityState, string> = {
    NEUTRAL: 'bg-white hover:bg-[#FAF9F7] text-[#121316] border-[#E8E7E3]',
    UNAVAILABLE: 'bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5] font-bold',
    PREFERRED: 'bg-[#F4F4F1] hover:bg-[#EAE8E4] text-[#121316] border-[#D3D1CB] font-semibold',
    STRONGLY_PREFERRED: 'bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#166534] border-[#86EFAC] font-bold',
    DISCOURAGED: 'bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="lux-card p-6 bg-white border-[#E8E7E3]">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-[#F4F4F1] text-[#575A65] border border-[#E8E7E3]">
              Constraint Boundaries
            </span>
            <h1 className="text-2xl font-bold text-[#121316] tracking-tight">Availability Matrix Studio</h1>
            <p className="text-xs text-[#575A65]">
              Configure available, unavailable (hard blocked), and preferred time windows for teachers, rooms, and student sections.
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#F4F4F1] text-[#121316] flex items-center justify-center">
            <CheckSquare className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Real-time Target Selector Bar */}
      <div className="lux-card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <select
              className="lux-select text-xs py-1.5 pl-3 pr-8 font-semibold text-[#121316] appearance-none cursor-pointer"
              value={entityType}
              onChange={e => {
                const type = e.target.value as any;
                setEntityType(type);
                if (type === 'TEACHER' && teachers.length > 0) setSelectedEntityId(teachers[0].id);
                if (type === 'ROOM' && rooms.length > 0) setSelectedEntityId(rooms[0].id);
                if (type === 'STUDENT_SECTION' && sections.length > 0) setSelectedEntityId(sections[0].id);
              }}
            >
              <option value="TEACHER">Faculty Member Availability</option>
              <option value="ROOM">Room / Laboratory Maintenance</option>
              <option value="STUDENT_SECTION">Student Section Availability</option>
            </select>
            <ChevronDown className="w-3 h-3 text-[#8B8E99] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {entityType === 'TEACHER' && (
            <div className="relative">
              <select
                className="lux-select text-xs py-1.5 pl-3 pr-8 font-medium appearance-none cursor-pointer"
                value={selectedEntityId}
                onChange={e => setSelectedEntityId(e.target.value)}
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

          {entityType === 'ROOM' && (
            <div className="relative">
              <select
                className="lux-select text-xs py-1.5 pl-3 pr-8 font-medium appearance-none cursor-pointer"
                value={selectedEntityId}
                onChange={e => setSelectedEntityId(e.target.value)}
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.roomType})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[#8B8E99] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {entityType === 'STUDENT_SECTION' && (
            <div className="relative">
              <select
                className="lux-select text-xs py-1.5 pl-3 pr-8 font-medium appearance-none cursor-pointer"
                value={selectedEntityId}
                onChange={e => setSelectedEntityId(e.target.value)}
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
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] font-semibold">
          <span className="px-2 py-0.5 rounded bg-white border border-[#E8E7E3] text-[#575A65]">Neutral</span>
          <span className="px-2 py-0.5 rounded bg-[#FEF2F2] text-[#B91C1C] border border-[#FCA5A5]">Unavailable</span>
          <span className="px-2 py-0.5 rounded bg-[#F4F4F1] text-[#121316] border border-[#D3D1CB]">Preferred</span>
          <span className="px-2 py-0.5 rounded bg-[#F0FDF4] text-[#166534] border border-[#86EFAC]">Strongly Preferred</span>
        </div>
      </div>

      {/* Interactive Click-to-Cycle Availability Grid */}
      <div className="lux-card p-5 overflow-hidden">
        <div className="text-xs text-[#8B8E99] mb-3 italic">
          💡 Click any time slot to cycle: Neutral → Unavailable (Hard) → Preferred → Strongly Preferred → Discouraged.
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-[#FAF9F7] border-b border-[#E8E7E3]">
                <th className="p-3 text-left text-xs font-bold uppercase tracking-wider text-[#8B8E99] w-28 pl-4">
                  Slot / Time
                </th>
                {days.map(d => (
                  <th key={d.id} className="p-3 text-center text-xs font-bold text-[#121316]">
                    {d.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E7E3]">
              {periods.map(pIdx => {
                const pSlot = calendar.find(s => s.periodIndex === pIdx) || { startTime: '09:00', endTime: '10:00' };

                return (
                  <tr key={pIdx}>
                    <td className="p-2.5 text-xs font-medium text-[#575A65] bg-[#FAF9F7]/80 pl-4 border-r border-[#E8E7E3]">
                      <div className="font-bold text-[#121316]">Period {pIdx + 1}</div>
                      <div className="text-[10px] text-[#8B8E99] mt-0.5">{pSlot.startTime} - {pSlot.endTime}</div>
                    </td>

                    {days.map(d => {
                      const state = getSlotState(d.id, pIdx);
                      return (
                        <td
                          key={d.id}
                          onClick={() => cycleSlotState(d.id, pIdx)}
                          className="p-1 border-r border-[#E8E7E3] last:border-r-0 cursor-pointer select-none"
                        >
                          <div
                            className={`h-13 rounded-md border p-2 flex flex-col justify-between transition-all duration-150 ${stateColors[state]}`}
                          >
                            <div className="text-[9px] uppercase font-bold tracking-wider">{state.replace(/_/g, ' ')}</div>
                            <div className="text-[9px] opacity-75">{d.short} P{pIdx + 1}</div>
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
    </div>
  );
};

export default AvailabilityMatrixView;
