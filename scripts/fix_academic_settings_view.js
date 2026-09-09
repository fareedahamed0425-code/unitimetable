const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'AcademicSettingsView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update selectedPeriodYear state definition and slotFormData defaults
content = content.replace(
  `  const [selectedPeriodYear, setSelectedPeriodYear] = useState<number | 'ALL'>('ALL');`,
  `  const [selectedPeriodYear, setSelectedPeriodYear] = useState<number>(1);
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'ALL'>('ALL');`
);

content = content.replace(
  `  const [slotFormData, setSlotFormData] = useState({
    day: 0,
    startTime: '09:00',
    endTime: '10:00',
    label: '',
    isBreak: false,
    yearNumber: 0
  });`,
  `  const [slotFormData, setSlotFormData] = useState({
    day: 0,
    startTime: '09:00',
    endTime: '09:50',
    label: '',
    isBreak: false,
    yearNumber: 1
  });`
);

content = content.replace(
  `  const [copyYearData, setCopyYearData] = useState({ sourceYear: 0, targetYear: 1 });`,
  `  const [copyYearData, setCopyYearData] = useState({ sourceYear: 1, targetYear: 2 });`
);

content = content.replace(
  `  const [applyDaysData, setApplyDaysData] = useState({ year: 0, sourceDay: 0 });`,
  `  const [applyDaysData, setApplyDaysData] = useState({ year: 1, sourceDay: 0 });`
);

// 2. Update loadSlots definition to accept number
content = content.replace(
  `  const loadSlots = useCallback(async (yearOverride?: number | 'ALL') => {
    try {
      setLoading(true);
      const targetYear = yearOverride !== undefined ? yearOverride : selectedPeriodYear;
      const data = await api.getAdminSlots(targetYear);`,
  `  const loadSlots = useCallback(async (yearOverride?: number) => {
    try {
      setLoading(true);
      const targetYear = yearOverride !== undefined ? yearOverride : selectedPeriodYear;
      const data = await api.getAdminSlots(targetYear);`
);

// 3. Add handlePopulateDefault
const handleAddSlotIdx = content.indexOf('  const handleAddSlot = async');
if (handleAddSlotIdx !== -1) {
  const populateFunc = `  const handlePopulateDefault = async (yearNum?: number) => {
    const yr = yearNum || selectedPeriodYear;
    try {
      setLoading(true);
      const res = await api.populateDefaultSlots(yr);
      showToast(res.message || \`Standard 8-period schedule populated for Year \${yr}\`);
      loadSlots(yr);
    } catch (err: any) {
      showToast(err.message || 'Failed to populate default periods', true);
    } finally {
      setLoading(false);
    }
  };\n\n`;
  content = content.slice(0, handleAddSlotIdx) + populateFunc + content.slice(handleAddSlotIdx);
}

// 4. Update handleAddSlot reset
content = content.replace(
  `      setSlotFormData({ day: 0, startTime: '09:00', endTime: '10:00', label: '', isBreak: false, yearNumber: selectedPeriodYear === 'ALL' ? 0 : selectedPeriodYear });`,
  `      setSlotFormData({ day: 0, startTime: '09:00', endTime: '09:50', label: '', isBreak: false, yearNumber: selectedPeriodYear });`
);

// 5. Update filteredSlots logic to also support day filter
content = content.replace(
  `  // Filtered Slots
  const filteredSlots = slots.filter(s => {
    if (!slotSearch) return true;
    const term = slotSearch.toLowerCase();
    return s.dayName?.toLowerCase().includes(term) ||
           s.startTime?.includes(term) ||
           s.endTime?.includes(term) ||
           s.label?.toLowerCase().includes(term);
  });`,
  `  // Filtered Slots (by selected year, day filter, and search term)
  const filteredSlots = slots.filter(s => {
    if (selectedDayFilter !== 'ALL' && s.day !== selectedDayFilter) return false;
    if (!slotSearch) return true;
    const term = slotSearch.toLowerCase();
    return s.dayName?.toLowerCase().includes(term) ||
           s.startTime?.includes(term) ||
           s.endTime?.includes(term) ||
           s.label?.toLowerCase().includes(term);
  });`
);

// 6. Replace TAB 1 Content
const tab1StartStr = "{/* TAB 1: TIME PERIODS & SLOTS (YEAR-SPECIFIC & GENERAL)                     */}\n      {/* ========================================================================= */}\n      {activeTab === 'periods' && (";
const tab2StartStr = "{/* ========================================================================= */}\n      {/* TAB 2: VENUES & CLASSROOMS";

const tab1StartIdx = content.indexOf(tab1StartStr);
const tab2StartIdx = content.indexOf(tab2StartStr);

if (tab1StartIdx === -1 || tab2StartIdx === -1) {
  console.error('Could not locate tab 1 boundaries', { tab1StartIdx, tab2StartIdx });
  process.exit(1);
}

const newTab1 = `{/* TAB 1: TIME PERIODS & SLOTS (YEAR-SPECIFIC: 1st, 2nd, 3rd, 4th Year)     */}
      {/* ========================================================================= */}
      {activeTab === 'periods' && (
        <div className="space-y-6">
          {/* Year Selector Tabs Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#D8E6ED] shadow-xs">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <div className="flex items-center gap-1.5 pr-2 border-r border-[#D8E6ED] shrink-0">
                <GraduationCap className="w-4 h-4 text-[#2582A1]" />
                <span className="text-xs font-bold text-[#002E4E]">Undergraduate Year:</span>
              </div>
              {[
                { year: 1, label: '1st Year', sub: 'B.Tech Year 1' },
                { year: 2, label: '2nd Year', sub: 'B.Tech Year 2' },
                { year: 3, label: '3rd Year', sub: 'B.Tech Year 3' },
                { year: 4, label: '4th Year', sub: 'B.Tech Year 4' },
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
                      {slotCount} {slotCount === 1 ? 'slot' : 'slots'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Batch Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handlePopulateDefault(selectedPeriodYear)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 transition"
                title="Populate standard 8 periods + morning & lunch breaks for this year"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Populate Standard 8 Periods</span>
              </button>
              <button
                onClick={() => {
                  setApplyDaysData({ year: selectedPeriodYear, sourceDay: 0 });
                  setShowApplyAllDaysModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#F4F8FA] hover:bg-[#E8F4F8] text-[#002E4E] rounded-xl text-xs font-bold border border-[#D8E6ED] transition"
                title="Copy Monday's timing to Tuesday-Saturday for this year"
              >
                <Calendar className="w-3.5 h-3.5 text-[#2582A1]" />
                <span>Sync to All 6 Days</span>
              </button>
              <button
                onClick={() => {
                  setCopyYearData({ sourceYear: selectedPeriodYear, targetYear: selectedPeriodYear === 1 ? 2 : 1 });
                  setShowCopyYearModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#F4F8FA] hover:bg-[#E8F4F8] text-[#002E4E] rounded-xl text-xs font-bold border border-[#D8E6ED] transition"
                title="Duplicate timings to another undergraduate year"
              >
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>Copy Year Schedule</span>
              </button>
            </div>
          </div>

          {/* Search, Day Filters & Add Period Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#D8E6ED] shadow-xs">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A6375]" />
                <input
                  type="text"
                  value={slotSearch}
                  onChange={e => setSlotSearch(e.target.value)}
                  placeholder="Search periods, time (e.g. 09:30), or label..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-[#D8E6ED] rounded-xl text-sm text-[#002E4E] placeholder-[#829BA8] focus:outline-none focus:border-[#2582A1]"
                />
              </div>

              {/* Day filter pills */}
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  onClick={() => setSelectedDayFilter('ALL')}
                  className={\`px-2.5 py-1.5 rounded-lg text-xs font-bold transition \${
                    selectedDayFilter === 'ALL'
                      ? 'bg-[#002E4E] text-white'
                      : 'bg-[#F4F8FA] text-[#4A6375] hover:bg-[#E8F4F8] border border-[#D8E6ED]'
                  }\`}
                >
                  All Days
                </button>
                {daysOfWeek.map((d, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedDayFilter(idx)}
                    className={\`px-2.5 py-1.5 rounded-lg text-xs font-bold transition \${
                      selectedDayFilter === idx
                        ? 'bg-[#2582A1] text-white'
                        : 'bg-[#F4F8FA] text-[#4A6375] hover:bg-[#E8F4F8] border border-[#D8E6ED]'
                    }\`}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setSlotFormData({
                  day: selectedDayFilter === 'ALL' ? 0 : selectedDayFilter,
                  startTime: '09:00',
                  endTime: '09:50',
                  label: '',
                  isBreak: false,
                  yearNumber: selectedPeriodYear
                });
                setShowAddSlotModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-xs transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Period ({selectedPeriodYear === 1 ? '1st' : selectedPeriodYear === 2 ? '2nd' : selectedPeriodYear === 3 ? '3rd' : '4th'} Year)</span>
            </button>
          </div>

          {/* Time Slots Table */}
          <div className="bg-white rounded-2xl border border-[#D8E6ED] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F4F8FA] text-[#4A6375] uppercase text-[11px] font-bold tracking-wider border-b border-[#D8E6ED]">
                  <tr>
                    <th className="px-6 py-3.5">Academic Year</th>
                    <th className="px-6 py-3.5">Day</th>
                    <th className="px-6 py-3.5">Period Index</th>
                    <th className="px-6 py-3.5">Start Time</th>
                    <th className="px-6 py-3.5">End Time</th>
                    <th className="px-6 py-3.5">Period Type / Lunch / Break</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8E6ED]">
                  {filteredSlots.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="max-w-md mx-auto space-y-4">
                          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E8F4F8] border border-[#C4E2EC] flex items-center justify-center">
                            <Clock className="w-7 h-7 text-[#2582A1]" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-[#002E4E]">
                              No Period Timings for {selectedPeriodYear === 1 ? '1st' : selectedPeriodYear === 2 ? '2nd' : selectedPeriodYear === 3 ? '3rd' : '4th'} Year
                            </h3>
                            <p className="text-xs text-[#4A6375] mt-1 leading-relaxed">
                              You can quickly populate the standard 8 periods with morning break and lunch break, or add individual custom periods.
                            </p>
                          </div>
                          <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                              onClick={() => handlePopulateDefault(selectedPeriodYear)}
                              className="px-4 py-2 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                            >
                              <Sparkles className="w-4 h-4" />
                              <span>Populate Standard 8 Periods</span>
                            </button>
                            <button
                              onClick={() => {
                                setSlotFormData({
                                  day: 0,
                                  startTime: '09:00',
                                  endTime: '09:50',
                                  label: 'Period 1',
                                  isBreak: false,
                                  yearNumber: selectedPeriodYear
                                });
                                setShowAddSlotModal(true);
                              }}
                              className="px-4 py-2 bg-[#F4F8FA] hover:bg-[#E8F4F8] text-[#002E4E] border border-[#D8E6ED] rounded-xl text-xs font-bold transition"
                            >
                              + Add Custom Period
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSlots.map(s => {
                      const isEditing = editingSlotId === s.id;
                      const yrLabel = s.yearNumber === 1 ? '1st Year' : s.yearNumber === 2 ? '2nd Year' : s.yearNumber === 3 ? '3rd Year' : s.yearNumber === 4 ? '4th Year' : \`Year \${s.yearNumber}\`;
                      return (
                        <tr key={s.id} className="hover:bg-[#F8FBFC] transition">
                          <td className="px-6 py-3.5">
                            {isEditing ? (
                              <select
                                id={\`slot-year-\${s.id}\`}
                                defaultValue={s.yearNumber || selectedPeriodYear}
                                className="bg-white border border-[#D8E6ED] rounded-lg px-2.5 py-1 text-xs font-bold text-[#002E4E]"
                              >
                                <option value={1}>1st Year (B.Tech Y1)</option>
                                <option value={2}>2nd Year (B.Tech Y2)</option>
                                <option value={3}>3rd Year (B.Tech Y3)</option>
                                <option value={4}>4th Year (B.Tech Y4)</option>
                              </select>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#E8F4F8] text-[#2582A1] border border-[#C4E2EC]">
                                {yrLabel}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="font-bold text-[#002E4E]">{s.dayName || daysOfWeek[s.day] || \`Day \${s.day}\`}</span>
                          </td>
                          <td className="px-6 py-3.5 text-[#4A6375] font-mono text-xs font-bold">
                            Period {s.periodIndex + 1}
                          </td>
                          <td className="px-6 py-3.5">
                            {isEditing ? (
                              <input
                                type="time"
                                defaultValue={s.startTime}
                                id={\`slot-start-\${s.id}\`}
                                className="bg-white border border-[#2582A1] rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-[#002E4E] focus:outline-none"
                              />
                            ) : (
                              <span className="font-mono text-[#002E4E] font-bold text-xs bg-[#F4F8FA] px-2 py-1 rounded-md border border-[#D8E6ED]">
                                {s.startTime}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            {isEditing ? (
                              <input
                                type="time"
                                defaultValue={s.endTime}
                                id={\`slot-end-\${s.id}\`}
                                className="bg-white border border-[#2582A1] rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-[#002E4E] focus:outline-none"
                              />
                            ) : (
                              <span className="font-mono text-[#002E4E] font-bold text-xs bg-[#F4F8FA] px-2 py-1 rounded-md border border-[#D8E6ED]">
                                {s.endTime}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            {isEditing ? (
                              <div className="flex items-center gap-3">
                                <input
                                  type="text"
                                  defaultValue={s.label || ''}
                                  id={\`slot-label-\${s.id}\`}
                                  placeholder="e.g. Period 1 / Lunch Break"
                                  className="bg-white border border-[#2582A1] rounded-lg px-2.5 py-1 text-xs text-[#002E4E] min-w-[150px] focus:outline-none"
                                />
                                <label className="flex items-center gap-1.5 text-xs text-[#002E4E] font-bold cursor-pointer">
                                  <input
                                    type="checkbox"
                                    id={\`slot-break-\${s.id}\`}
                                    defaultChecked={s.isBreak}
                                    className="rounded bg-white border-[#D8E6ED] text-[#2582A1] w-4 h-4 cursor-pointer"
                                  />
                                  <span>Break / Lunch</span>
                                </label>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className={\`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 \${
                                  s.isBreak
                                    ? s.label?.toLowerCase().includes('lunch')
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }\`}>
                                  <span className={\`w-2 h-2 rounded-full \${s.isBreak ? 'bg-amber-500' : 'bg-emerald-500'}\`} />
                                  {s.isBreak ? (s.label || 'Break / Interval') : (s.label || 'Academic Lecture')}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    const start = (document.getElementById(\`slot-start-\${s.id}\`) as HTMLInputElement)?.value;
                                    const end = (document.getElementById(\`slot-end-\${s.id}\`) as HTMLInputElement)?.value;
                                    const label = (document.getElementById(\`slot-label-\${s.id}\`) as HTMLInputElement)?.value;
                                    const isBreak = (document.getElementById(\`slot-break-\${s.id}\`) as HTMLInputElement)?.checked;
                                    const yearNum = Number((document.getElementById(\`slot-year-\${s.id}\`) as HTMLSelectElement)?.value || selectedPeriodYear);
                                    handleSaveSlot(s.id, { startTime: start, endTime: end, label, isBreak, yearNumber: yearNum });
                                  }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                                  title="Save Changes"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Save</span>
                                </button>
                                <button
                                  onClick={() => setEditingSlotId(null)}
                                  className="px-3 py-1.5 bg-[#F4F8FA] text-[#4A6375] hover:bg-[#E8F4F8] rounded-lg text-xs font-medium transition"
                                  title="Cancel"
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
        </div>
      )}\n\n      `;

content = content.slice(0, tab1StartIdx) + newTab1 + content.slice(tab2StartIdx);

// 7. Update Modals: Add Slot, Copy Year, Apply All Days
// Replace Year selects in showAddSlotModal
content = content.replace(
  `<select
                  value={slotFormData.yearNumber}
                  onChange={e => setSlotFormData({ ...slotFormData, yearNumber: parseInt(e.target.value, 10) })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                >
                  <option value={0}>All Years (General Default Schedule)</option>
                  <option value={1}>Year 1 (B.Tech Year 1)</option>
                  <option value={2}>Year 2 (B.Tech Year 2)</option>
                  <option value={3}>Year 3 (B.Tech Year 3)</option>
                  <option value={4}>Year 4 (B.Tech Year 4)</option>
                </select>`,
  `<select
                  value={slotFormData.yearNumber}
                  onChange={e => setSlotFormData({ ...slotFormData, yearNumber: parseInt(e.target.value, 10) })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm font-bold focus:border-[#2582A1]"
                >
                  <option value={1}>1st Year (B.Tech Year 1)</option>
                  <option value={2}>2nd Year (B.Tech Year 2)</option>
                  <option value={3}>3rd Year (B.Tech Year 3)</option>
                  <option value={4}>4th Year (B.Tech Year 4)</option>
                </select>`
);

// Replace Source Year in showCopyYearModal
content = content.replace(
  `<select
                  value={copyYearData.sourceYear}
                  onChange={e => setCopyYearData({ ...copyYearData, sourceYear: parseInt(e.target.value, 10) })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                >
                  <option value={0}>All Years (General Default)</option>
                  <option value={1}>Year 1 Schedule</option>
                  <option value={2}>Year 2 Schedule</option>
                  <option value={3}>Year 3 Schedule</option>
                  <option value={4}>Year 4 Schedule</option>
                </select>`,
  `<select
                  value={copyYearData.sourceYear}
                  onChange={e => setCopyYearData({ ...copyYearData, sourceYear: parseInt(e.target.value, 10) })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm font-bold focus:border-[#2582A1]"
                >
                  <option value={1}>1st Year Schedule</option>
                  <option value={2}>2nd Year Schedule</option>
                  <option value={3}>3rd Year Schedule</option>
                  <option value={4}>4th Year Schedule</option>
                </select>`
);

content = content.replace(
  `<select
                  value={copyYearData.targetYear}
                  onChange={e => setCopyYearData({ ...copyYearData, targetYear: parseInt(e.target.value, 10) })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                >
                  <option value={1}>Year 1 (B.Tech Year 1)</option>
                  <option value={2}>Year 2 (B.Tech Year 2)</option>
                  <option value={3}>Year 3 (B.Tech Year 3)</option>
                  <option value={4}>Year 4 (B.Tech Year 4)</option>
                </select>`,
  `<select
                  value={copyYearData.targetYear}
                  onChange={e => setCopyYearData({ ...copyYearData, targetYear: parseInt(e.target.value, 10) })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm font-bold focus:border-[#2582A1]"
                >
                  <option value={1}>1st Year (B.Tech Year 1)</option>
                  <option value={2}>2nd Year (B.Tech Year 2)</option>
                  <option value={3}>3rd Year (B.Tech Year 3)</option>
                  <option value={4}>4th Year (B.Tech Year 4)</option>
                </select>`
);

// Replace Target Year in showApplyAllDaysModal
content = content.replace(
  `<select
                  value={applyDaysData.year}
                  onChange={e => setApplyDaysData({ ...applyDaysData, year: parseInt(e.target.value, 10) })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm focus:border-[#2582A1]"
                >
                  <option value={0}>All Years (General Default Schedule)</option>
                  <option value={1}>Year 1 (B.Tech Year 1)</option>
                  <option value={2}>Year 2 (B.Tech Year 2)</option>
                  <option value={3}>Year 3 (B.Tech Year 3)</option>
                  <option value={4}>Year 4 (B.Tech Year 4)</option>
                </select>`,
  `<select
                  value={applyDaysData.year}
                  onChange={e => setApplyDaysData({ ...applyDaysData, year: parseInt(e.target.value, 10) })}
                  className="w-full bg-white border border-[#D8E6ED] rounded-xl px-3 py-2 text-[#002E4E] text-sm font-bold focus:border-[#2582A1]"
                >
                  <option value={1}>1st Year (B.Tech Year 1)</option>
                  <option value={2}>2nd Year (B.Tech Year 2)</option>
                  <option value={3}>3rd Year (B.Tech Year 3)</option>
                  <option value={4}>4th Year (B.Tech Year 4)</option>
                </select>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated AcademicSettingsView.tsx!');
