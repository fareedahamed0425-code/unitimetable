const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'AcademicSettingsView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update selectedDayFilter default to 0 (Monday)
content = content.replace(
  `  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'ALL'>('ALL');`,
  `  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'MATRIX'>(0);`
);

// Find Tab 1 section and replace with clean day-based table + matrix grid view
const tab1StartStr = "{/* TAB 1: TIME PERIODS & SLOTS (YEAR-SPECIFIC: 1st, 2nd, 3rd, 4th Year)     */}\n      {/* ========================================================================= */}\n      {activeTab === 'periods' && (";
const tab2StartStr = "{/* ========================================================================= */}\n      /* TAB 2: VENUES & CLASSROOMS";

const tab1StartIdx = content.indexOf(tab1StartStr);
const tab2StartIdx = content.indexOf(tab2StartStr);

if (tab1StartIdx === -1 || tab2StartIdx === -1) {
  console.error('Could not locate tab 1 boundaries', { tab1StartIdx, tab2StartIdx });
  process.exit(1);
}

const newTab1 = `{/* TAB 1: TIME PERIODS & SLOTS (TABULAR FORMAT WITH DAY TABS & MATRIX)     */}
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
                    className={\`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 \${
                      isSelected
                        ? 'bg-[#2582A1] text-white shadow-sm ring-2 ring-[#2582A1]/20'
                        : 'bg-[#F4F8FA] text-[#4A6375] hover:text-[#002E4E] hover:bg-[#E8F4F8] border border-[#D8E6ED]'
                    }\`}
                  >
                    <span>{y.label}</span>
                    <span className="text-[10px] opacity-80 font-normal">({y.sub})</span>
                    <span className={\`text-[10px] px-2 py-0.5 rounded-full font-bold \${
                      isSelected ? 'bg-[#1C6982] text-white' : 'bg-white text-[#4A6375] border border-[#D8E6ED]'
                    }\`}>
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
                    className={\`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 \${
                      isSelected
                        ? 'bg-[#002E4E] text-white shadow-xs'
                        : 'bg-[#F4F8FA] text-[#4A6375] hover:bg-[#E8F4F8] hover:text-[#002E4E] border border-[#D8E6ED]'
                    }\`}
                  >
                    <span>{d}</span>
                    <span className={\`text-[10px] px-1.5 py-0.2 rounded-full font-bold \${
                      isSelected ? 'bg-[#2582A1] text-white' : 'bg-white text-[#4A6375] border border-[#D8E6ED]'
                    }\`}>
                      {daySlots.length}
                    </span>
                  </button>
                );
              })}

              <button
                onClick={() => setSelectedDayFilter('MATRIX')}
                className={\`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ml-1 \${
                  selectedDayFilter === 'MATRIX'
                    ? 'bg-[#2582A1] text-white shadow-xs'
                    : 'bg-[#E8F4F8] text-[#2582A1] hover:bg-[#D4EAF2] border border-[#2582A1]/30'
                }\`}
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
                  title={\`Copy \${daysOfWeek[selectedDayFilter]}'s timings across all 6 days\`}
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
                                    id={\`slot-label-\${s.id}\`}
                                    placeholder="e.g. Period 1, Tea Break, Lunch Break"
                                    className="bg-white border border-[#2582A1] rounded-lg px-2.5 py-1 text-xs font-bold text-[#002E4E] focus:outline-none w-full max-w-[200px]"
                                  />
                                ) : (
                                  <span className="font-bold text-[#002E4E] text-xs">
                                    {s.label || \`Period \${s.periodIndex + 1}\`}
                                  </span>
                                )}
                              </td>

                              {/* Start Time */}
                              <td className="px-5 py-3.5">
                                {isEditing ? (
                                  <input
                                    type="time"
                                    defaultValue={s.startTime}
                                    id={\`slot-start-\${s.id}\`}
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
                                    id={\`slot-end-\${s.id}\`}
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
                                    return mins > 0 ? \`\${mins} min\` : '50 min';
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
                                      id={\`slot-break-\${s.id}\`}
                                      defaultChecked={s.isBreak}
                                      className="rounded bg-white border-[#D8E6ED] text-[#2582A1] w-4 h-4 cursor-pointer"
                                    />
                                    <span>Is Break / Lunch</span>
                                  </label>
                                ) : (
                                  <span className={\`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 \${
                                    s.isBreak
                                      ? isLunch
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }\`}>
                                    <span className={\`w-2 h-2 rounded-full \${s.isBreak ? 'bg-amber-500' : 'bg-emerald-500'}\`} />
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
                                        const start = (document.getElementById(\`slot-start-\${s.id}\`) as HTMLInputElement)?.value;
                                        const end = (document.getElementById(\`slot-end-\${s.id}\`) as HTMLInputElement)?.value;
                                        const label = (document.getElementById(\`slot-label-\${s.id}\`) as HTMLInputElement)?.value;
                                        const isBreak = (document.getElementById(\`slot-break-\${s.id}\`) as HTMLInputElement)?.checked;
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
                                <div className={\`p-1.5 rounded-lg border text-left space-y-0.5 \${
                                  slot.isBreak
                                    ? isLunch
                                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                                      : 'bg-amber-50/60 border-amber-200 text-amber-800'
                                    : 'bg-[#E8F4F8]/60 border-[#C4E2EC] text-[#002E4E]'
                                }\`}>
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
                                    {slot.label || (slot.isBreak ? 'Break' : \`Period \${pIdx + 1}\`)}
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
      )}\n\n      `;

content = content.slice(0, tab1StartIdx) + newTab1 + content.slice(tab2StartIdx);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated Tab 1 to clean tabular format in AcademicSettingsView.tsx!');
