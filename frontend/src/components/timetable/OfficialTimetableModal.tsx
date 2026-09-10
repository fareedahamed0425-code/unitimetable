import React, { useMemo } from 'react';
import {
  Download,
  Printer,
  FileSpreadsheet,
  X,
  Sparkles,
  Layers,
  CheckCircle2
} from 'lucide-react';
import {
  exportOfficialTimetableExcel,
  formatRoman,
  OfficialSubjectRow
} from './officialTimetableExporter';
import { Timetable, Section, Teacher, Course, Room, Activity } from '../../../../shared/types';

interface OfficialTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  timetable: Timetable | null;
  section: Section | null;
  teachers: Teacher[];
  courses: Course[];
  rooms: Room[];
  activities: Activity[];
  customMeta?: {
    wefDate?: string;
    classTeacher?: string;
    roomNo?: string;
    refNo?: string;
    issueNo?: string;
    date?: string;
    revision?: string;
    revisionDate?: string;
    academicYear?: string;
    docNo?: string;
  };
}

export const OfficialTimetableModal: React.FC<OfficialTimetableModalProps> = ({
  isOpen,
  onClose,
  timetable,
  section,
  teachers,
  courses,
  rooms,
  activities,
  customMeta
}) => {
  if (!isOpen || !timetable) return null;

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Calculate year and semester numbers
  const semesterNum = (section as any)?.semesterNumber || (section as any)?.semester_number || (section?.yearNumber ? section.yearNumber * 2 - 1 : 5);
  const yearNum = section?.yearNumber || Math.ceil(Number(semesterNum) / 2) || 3;
  const yearRoman = formatRoman(yearNum);
  const semRoman = formatRoman(semesterNum);

  // Class teacher & room lookup
  const classTeacherObj = teachers.find(t => t.id === (section?.classTeacherId || (section as any)?.class_teacher_id));
  const classTeacherName = customMeta?.classTeacher || section?.classTeacherName || classTeacherObj?.name || 'Mrs M M Asha';
  const homeRoomObj = rooms.find(r => r.id === (section?.homeRoomId || (section as any)?.home_room_id));
  const roomCode = customMeta?.roomNo || section?.homeRoomName || homeRoomObj?.code || '202';

  const deptName = section?.name || 'CSE-AIML-A';
  const refNumber = customMeta?.refNo || `TAU/SOT/TT/${yearRoman}-${semRoman}/${deptName.replace(/\s+/g, '-')}/2026-27/01`;
  const wefDate = customMeta?.wefDate || '24-08-2026';
  const issueNo = customMeta?.issueNo || '01';
  const docDate = customMeta?.date || '30-06-2026';
  const revision = customMeta?.revision || '01';
  const revisionDate = customMeta?.revisionDate || '23-08-2026';
  const academicYear = customMeta?.academicYear || '2026-27';
  const docNo = customMeta?.docNo || 'Doc.No: 4';

  // Build grid entries mapped for the section
  const sectionEntries = useMemo(() => {
    if (!timetable?.entries) return [];
    if (!section) return timetable.entries;
    return timetable.entries.filter(e => 
      e.sectionNames?.includes(section.name) || 
      (e as any).sectionIds?.includes(section.id) ||
      activities.find(a => a.id === e.activityId)?.sectionIds?.includes(section.id)
    );
  }, [timetable, section, activities]);

  // Standard period structure from template:
  // P1: 09:00 to 10:00 (I)
  // P2: 10:00 to 11:00 (II)
  // BREAK: 11:00 to 11:10
  // P3: 11:10 to 12:10 (III)
  // P4: 12:10 to 1:00 (IV)
  // LUNCH: 1:00 to 2:00
  // P5: 2:00 to 3:00 (V)
  // P6: 3:00 to 4:00 (VI)
  const periodHeaders = [
    { num: 'I', time: '09.00 to 10.00', index: 0 },
    { num: 'II', time: '10.00 to 11.00', index: 1 },
    { num: 'III', time: '11.10 to 12.10', index: 2 },
    { num: 'IV', time: '12.10 to 1.00', index: 3 },
    { num: 'V', time: '2.00 to 3.00', index: 4 },
    { num: 'VI', time: '3.00 to 4.00', index: 5 }
  ];

  // Helper to find entry for a specific day and period
  const getCellData = (dayIdx: number, pIdx: number) => {
    const entry = sectionEntries.find(e => e.dayOfWeek === dayIdx && e.periodIndex === pIdx);
    if (!entry) return null;
    return entry;
  };

  // Build Day Rows with lab spanning logic
  const gridRows = useMemo(() => {
    return [0, 1, 2, 3, 4, 5].map(dayIdx => {
      const dayName = daysOfWeek[dayIdx];
      const p0 = getCellData(dayIdx, 0);
      const p1 = getCellData(dayIdx, 1);
      const p2 = getCellData(dayIdx, 2);
      const p3 = getCellData(dayIdx, 3);
      const p4 = getCellData(dayIdx, 4);
      const p5 = getCellData(dayIdx, 5);

      // Check for multi-period spanning in morning 2 (p2, p3) or afternoon (p4, p5)
      const isMidMorningLab = p2 && p2.duration && p2.duration >= 2;
      const isAfternoonLab = p4 && p4.duration && p4.duration >= 2;

      return {
        dayIndex: dayIdx,
        dayName,
        p0,
        p1,
        p2,
        p3,
        p4,
        p5,
        isMidMorningLab,
        isAfternoonLab
      };
    });
  }, [sectionEntries]);

  // Build Subject Allocation Table with Hours and Faculty Contact info
  const subjectList: OfficialSubjectRow[] = useMemo(() => {
    const courseMap = new Map<string, {
      code: string;
      name: string;
      teacherIds: Set<string>;
      totalHours: number;
    }>();

    for (const entry of sectionEntries) {
      const cKey = entry.courseCode || (entry as any).courseId || entry.courseName || entry.activityName || entry.activityId;
      if (!cKey) continue;
      if (!courseMap.has(cKey)) {
        courseMap.set(cKey, {
          code: entry.courseCode || 'SUB',
          name: entry.courseName || entry.activityName || 'Subject',
          teacherIds: new Set(entry.teacherIds || []),
          totalHours: entry.duration || 1
        });
      } else {
        const item = courseMap.get(cKey)!;
        entry.teacherIds?.forEach(t => item.teacherIds.add(t));
        item.totalHours += (entry.duration || 1);
      }
    }

    // Default template fallback list if no database entries yet
    if (courseMap.size === 0) {
      return [
        { slNo: 1, code: 'BTMT3301', name: 'Computer Networks', facultyName: 'Dr.G.Asha', phone: '9791758021', hours: 3 },
        { slNo: 2, code: 'BTMT3302', name: 'Automata and Compiler Design', facultyName: 'Dr.Y.Sreeraman', phone: '9440725229', hours: 4 },
        { slNo: 3, code: 'BTMT3501', name: 'Data Analytics and Visualaization', facultyName: 'Dr. D Jagadeesan', phone: '9994249309', hours: 3 },
        { slNo: 4, code: '', name: 'Faculty Elective – I (UNIX,CNS,AI,ADS,CV)', facultyName: 'Dr K. Divya/Dr N Jayakrishna/ Mrs.D Bharathi/Dr R. Anitha/Mrs.Haritha', phone: '8106228154/ 9640863731/ 8520809189/ 9600100361/ 7989218755', hours: 3 },
        { slNo: 5, code: 'BTMT3601e', name: 'Program Elective-I(AI and ML in Business Models)', facultyName: 'Mr Y Ganesh', phone: '6304454903', hours: 3 },
        { slNo: 6, code: '', name: 'MOOC-I', facultyName: 'Mr Y Ganesh', phone: '6304454903', hours: 3 },
        { slNo: 7, code: 'BTMT3901', name: 'Entrepreneurship and Start up Management', facultyName: 'Dr Saritha', phone: '9182090166', hours: 3 },
        { slNo: 8, code: 'BTML3301', name: 'Computer Networks Lab', facultyName: 'Dr.G.Asha, Mrs. R Samundi', phone: '9791758021, 8637662553', hours: 2 },
        { slNo: 9, code: 'BTML3501', name: 'Exploratory Data Analytics with R Lab', facultyName: 'Mrs. R Samundi, Dr. N Jaya Krishna', phone: '8637662553, 9640863731', hours: 2 },
        { slNo: 10, code: '', name: 'Mentoring', facultyName: 'Dr M M Asha', phone: '9347958500', hours: 1 },
        { slNo: 11, code: '', name: 'CRT', facultyName: 'Mrs D Bharathi', phone: '8520809189', hours: 2 },
        { slNo: 12, code: '', name: 'Physical Activities', facultyName: 'Mr. Dileep kumar', phone: '9959493716', hours: 2 },
        { slNo: 13, code: '', name: 'LIBRARY', facultyName: '', phone: '', hours: 1 },
        { slNo: 14, code: '', name: 'Extra-curricular Activities', facultyName: '', phone: '', hours: 2 },
        { slNo: '', code: '', name: 'APTITUDE', facultyName: 'Dr. Syed Fazuruddin', phone: '9989759386', hours: 1 },
        { slNo: '', code: '', name: 'PLACEMENT TRAINING', facultyName: 'Mr.Mohammed Imaran', phone: '9959825511', hours: 1 }
      ];
    }

    let sl = 1;
    const list: OfficialSubjectRow[] = [];
    courseMap.forEach((val) => {
      const facultyNames = Array.from(val.teacherIds)
        .map(tId => teachers.find(t => t.id === tId)?.name || 'Faculty')
        .join(', ');
      const facultyPhones = Array.from(val.teacherIds)
        .map(tId => teachers.find(t => t.id === tId)?.phone || '-')
        .filter(p => p !== '-')
        .join(', ');

      list.push({
        slNo: sl++,
        code: val.code,
        name: val.name,
        facultyName: facultyNames || 'TBD',
        phone: facultyPhones || '-',
        hours: val.totalHours
      });
    });

    return list;
  }, [sectionEntries, teachers]);

  const handleDownloadExcel = () => {
    const gridData = {
      periodHeaders: periodHeaders.map(p => ({ periodNumber: p.num, time: p.time })),
      breakTime: '11.00 to 11.10',
      lunchTime: '1.00 to 2.00',
      days: gridRows.map(r => ({
        name: r.dayName,
        morning1: r.p0?.courseCode || r.p0?.activityName || '-',
        morning2: r.p1?.courseCode || r.p1?.activityName || '-',
        midMorning1: r.p2?.courseCode || r.p2?.activityName || '-',
        midMorning2: r.isMidMorningLab ? '' : (r.p3?.courseCode || r.p3?.activityName || '-'),
        afternoon1: r.p4?.courseCode || r.p4?.activityName || '-',
        afternoon2: r.isAfternoonLab ? '' : (r.p5?.courseCode || r.p5?.activityName || '-')
      }))
    };

    const meta = {
      universityName: 'The Apollo University',
      schoolName: 'School of Technology',
      wefDate,
      classTeacher: classTeacherName,
      roomNo: roomCode,
      refNo: refNumber,
      issueNo,
      date: docDate,
      revision,
      revisionDate,
      course: 'B.Tech',
      dept: deptName,
      year: yearNum,
      semester: semesterNum,
      academicYear,
      docNo: '4'
    };

    exportOfficialTimetableExcel(meta, gridData, subjectList);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#002E4E]/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container Box */}
      <div className="bg-white rounded-2xl shadow-2xl border border-[#D8E6ED] max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Top Action Bar (Hidden when printing) */}
        <div className="flex items-center justify-between p-4 bg-[#002E4E] text-white border-b border-[#002E4E] shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-bold text-sm tracking-wide uppercase">Official Timetable Template View</h2>
              <p className="text-[11px] text-[#A2C3D4]">School of Technology — Exact Institutional Download Format</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2582A1] hover:bg-[#1C6982] text-white rounded-lg text-xs font-bold transition shadow-xs"
              title="Print or Save as Official PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
              title="Download Excel Workbook (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download Excel</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A2C3D4] hover:text-white hover:bg-white/10 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white text-black print:p-0 print:overflow-visible">
          {/* Outer Border Box matching template */}
          <div className="border-[2px] border-black text-black font-sans text-xs select-text">
            {/* Header: University Title */}
            <div className="border-b border-black text-center py-1 font-bold text-sm tracking-wide">
              The Apollo University
            </div>

            {/* Header: School Title */}
            <div className="border-b border-black text-center py-1 font-bold text-xs tracking-wide">
              School of Technology
            </div>

            {/* Row 3: TIME TABLE (w.e.f) | Class Teacher | RoomNo */}
            <div className="grid grid-cols-3 border-b border-black text-center font-bold py-1 px-2 text-[11px]">
              <div className="text-left font-bold">TIME TABLE (w.e.f:{wefDate})</div>
              <div>Class Teacher:{classTeacherName}</div>
              <div className="text-right">RoomNo:{roomCode}</div>
            </div>

            {/* Row 4: Ref. No. | ISSUE No | Date | Revision | Revision Date */}
            <div className="grid grid-cols-5 border-b border-black text-[10px] font-bold py-1 px-2 text-center bg-gray-50/50">
              <div className="text-left truncate">Ref. No.:{refNumber}</div>
              <div>ISSUE No: {issueNo}</div>
              <div>Date: {docDate}</div>
              <div>Revision: {revision}</div>
              <div className="text-right">Revision Date: {revisionDate}</div>
            </div>

            {/* Row 5: Course | Dept | Year | Sem | Academic Year */}
            <div className="grid grid-cols-5 border-b border-black text-[11px] font-bold py-1 px-2 text-center">
              <div className="text-left">Course: B.Tech</div>
              <div>Dept: {deptName}</div>
              <div>Year: {yearRoman}</div>
              <div>Sem - {semRoman}</div>
              <div className="text-right">Academic Year: {academicYear}</div>
            </div>

            {/* WEEKLY TIMETABLE GRID */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-center text-[10px]">
                <thead>
                  {/* Top Yellow Header Row: Period Roman Numerals + Break / Lunch Times */}
                  <tr className="bg-[#FFFF00] text-black font-bold border-b border-black">
                    <th rowSpan={2} className="border-r border-b border-black px-2 py-1 bg-[#92D050] w-16 text-[11px]">
                      Day
                    </th>
                    <th className="border-r border-black px-2 py-1 font-bold">I</th>
                    <th className="border-r border-black px-2 py-1 font-bold">II</th>
                    <th className="border-r border-black px-1 py-1 font-bold text-[9px] w-14">11.00 to 11.10</th>
                    <th className="border-r border-black px-2 py-1 font-bold">III</th>
                    <th className="border-r border-black px-2 py-1 font-bold">IV</th>
                    <th className="border-r border-black px-1 py-1 font-bold text-[9px] w-14">1.00 to 2.00</th>
                    <th className="border-r border-black px-2 py-1 font-bold">V</th>
                    <th className="px-2 py-1 font-bold">VI</th>
                  </tr>

                  {/* Second Yellow Header Row: Timings + BREAK / LUNCH Labels */}
                  <tr className="bg-[#FFFF00] text-black font-bold border-b border-black text-[9.5px]">
                    <th className="border-r border-black px-1 py-0.5 font-bold">09.00 to 10.00</th>
                    <th className="border-r border-black px-1 py-0.5 font-bold">10.00 to 11.00</th>
                    <th rowSpan={7} className="border-r border-black font-bold text-xs tracking-widest uppercase align-middle bg-white w-14 px-1 py-2">
                      <div className="rotate-0 font-bold">BREAK</div>
                    </th>
                    <th className="border-r border-black px-1 py-0.5 font-bold">11.10 to 12.10</th>
                    <th className="border-r border-black px-1 py-0.5 font-bold">12.10 to 1.00</th>
                    <th rowSpan={7} className="border-r border-black font-bold text-xs tracking-widest uppercase align-middle bg-white w-14 px-1 py-2">
                      <div className="rotate-0 font-bold">LUNCH</div>
                    </th>
                    <th className="border-r border-black px-1 py-0.5 font-bold">2.00 to 3.00</th>
                    <th className="px-1 py-0.5 font-bold">3.00 to 4.00</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black">
                  {gridRows.map(row => {
                    const isSaturday = row.dayIndex === 5;
                    return (
                      <tr key={row.dayIndex} className="border-b border-black h-8 text-[10px] font-bold">
                        {/* Day Name (Light green cell) */}
                        <td className="bg-[#92D050] font-bold border-r border-black px-2 py-1 text-[11px] text-center">
                          {row.dayName}
                        </td>

                        {/* Period 0 (I) */}
                        <td className="border-r border-black px-1.5 py-1">
                          {row.p0?.courseCode || row.p0?.activityName || (isSaturday ? 'E&SM' : '-')}
                        </td>

                        {/* Period 1 (II) */}
                        <td className="border-r border-black px-1.5 py-1">
                          {row.p1?.courseCode || row.p1?.activityName || (isSaturday ? 'ACD' : '-')}
                        </td>

                        {/* BREAK column is handled by rowSpan */}

                        {/* Mid-morning periods: Check for lab span */}
                        {row.isMidMorningLab ? (
                          <td colSpan={2} className="border-r border-black px-2 py-1 text-center font-bold tracking-wide">
                            {row.p2?.courseCode || row.p2?.activityName || 'CN LAB'}
                          </td>
                        ) : isSaturday ? (
                          <td colSpan={2} className="border-r border-black px-2 py-1 text-center font-bold tracking-wide">
                            SPORTS
                          </td>
                        ) : (
                          <>
                            <td className="border-r border-black px-1.5 py-1">
                              {row.p2?.courseCode || row.p2?.activityName || '-'}
                            </td>
                            <td className="border-r border-black px-1.5 py-1">
                              {row.p3?.courseCode || row.p3?.activityName || '-'}
                            </td>
                          </>
                        )}

                        {/* LUNCH column is handled by rowSpan */}

                        {/* Afternoon periods: Check for lab span */}
                        {row.isAfternoonLab ? (
                          <td colSpan={2} className="px-2 py-1 text-center font-bold tracking-wide">
                            {row.p4?.courseCode || row.p4?.activityName || 'EDA with R LAB'}
                          </td>
                        ) : isSaturday ? (
                          <td colSpan={2} className="px-2 py-1 text-center font-bold tracking-wide">
                            Club Activities
                          </td>
                        ) : (
                          <>
                            <td className="border-r border-black px-1.5 py-1">
                              {row.p4?.courseCode || row.p4?.activityName || '-'}
                            </td>
                            <td className="px-1.5 py-1">
                              {row.p5?.courseCode || row.p5?.activityName || '-'}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* SUBJECT ALLOCATION TABLE (Bottom half) */}
            <div className="border-t-[2px] border-black">
              <table className="w-full border-collapse text-left text-[10px]">
                <thead>
                  <tr className="bg-[#FFFF00] text-black font-bold border-b border-black text-center text-[10.5px]">
                    <th className="border-r border-black px-2 py-1 w-12 text-center">Sl.No</th>
                    <th className="border-r border-black px-2 py-1 w-28 text-center">Subject Code</th>
                    <th className="border-r border-black px-3 py-1 text-left">Subject Name</th>
                    <th className="border-r border-black px-3 py-1 text-left">Faculty Full Name</th>
                    <th className="border-r border-black px-3 py-1 text-left w-48">Phone No.</th>
                    <th className="px-2 py-1 w-12 text-center">Hrs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-normal">
                  {subjectList.map((sub, idx) => (
                    <tr key={idx} className="border-b border-black h-6 hover:bg-gray-50/50">
                      <td className="border-r border-black px-2 py-0.5 text-center font-bold">{sub.slNo}</td>
                      <td className="border-r border-black px-2 py-0.5 text-center font-bold font-mono">{sub.code || ''}</td>
                      <td className="border-r border-black px-3 py-0.5 font-medium">{sub.name}</td>
                      <td className="border-r border-black px-3 py-0.5">{sub.facultyName}</td>
                      <td className="border-r border-black px-3 py-0.5 font-mono text-[9px]">{sub.phone}</td>
                      <td className="px-2 py-0.5 text-center font-bold">{sub.hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Document Number Footer */}
            <div className="p-1 px-2 font-bold text-[10px] text-left">
              {docNo}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
