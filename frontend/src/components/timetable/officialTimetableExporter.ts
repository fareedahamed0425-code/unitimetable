import * as XLSX from 'xlsx';

export interface OfficialTimetableMeta {
  universityName?: string;
  schoolName?: string;
  wefDate?: string;
  classTeacher?: string;
  roomNo?: string;
  refNo?: string;
  issueNo?: string;
  date?: string;
  revision?: string;
  revisionDate?: string;
  course?: string;
  dept?: string;
  year?: string | number;
  semester?: string | number;
  academicYear?: string;
  docNo?: string;
}

export interface OfficialSubjectRow {
  slNo: number | string;
  code: string;
  name: string;
  facultyName: string;
  phone: string;
  hours: number | string;
}

export function formatRoman(num: number | string): string {
  const n = typeof num === 'string' ? parseInt(num, 10) : num;
  if (isNaN(n)) return String(num || 'I');
  const romanMap: Record<number, string> = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
    6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X'
  };
  return romanMap[n] || String(n);
}

/**
 * Generates and downloads the Official Timetable as an Excel (.xlsx) file
 * matching The Apollo University official template format with merged cells and headers.
 */
export function exportOfficialTimetableExcel(
  meta: OfficialTimetableMeta,
  gridData: {
    periodHeaders: { periodNumber: string; time: string }[];
    breakTime: string;
    lunchTime: string;
    days: {
      name: string;
      morning1: string;
      morning2: string;
      midMorning1: string;
      midMorning2: string;
      afternoon1: string;
      afternoon2: string;
    }[];
  },
  subjects: OfficialSubjectRow[],
  filename?: string
) {
  const rows: any[][] = [];

  // Row 1: University Name (A1:I1)
  rows.push([meta.universityName || 'The Apollo University', '', '', '', '', '', '', '', '']);
  // Row 2: School Name (A2:I2)
  rows.push([meta.schoolName || 'School of Technology', '', '', '', '', '', '', '', '']);
  // Row 3: TIME TABLE (w.e.f) (A3:C3) | Class Teacher (D3:F3) | RoomNo (G3:I3)
  rows.push([
    `TIME TABLE (w.e.f:${meta.wefDate || '24-08-2026'})`, '', '',
    `Class Teacher:${meta.classTeacher || 'Mrs M M Asha'}`, '', '',
    `RoomNo:${meta.roomNo || '202'}`, '', ''
  ]);
  // Row 4: Ref No (A4:B4) | ISSUE No (C4) | Date (D4) | Revision (E4) | Revision Date (F4:I4)
  rows.push([
    `Ref. No.:${meta.refNo || 'TAU/SOT/TT/III-V/CSE-AIML-A/2026-27/01'}`, '',
    `ISSUE No: ${meta.issueNo || '01'}`,
    `Date: ${meta.date || '30-06-2026'}`,
    `Revision:${meta.revision || '01'}`,
    `Revision Date: ${meta.revisionDate || '23-08-2026'}`, '', '', ''
  ]);
  // Row 5: Course (A5:B5) | Dept (C5) | Year (D5) | Sem (E5) | Academic Year (F5:I5)
  rows.push([
    `Course: ${meta.course || 'B.Tech'}`, '',
    `Dept: ${meta.dept || 'AIML-A'}`,
    `Year: ${formatRoman(meta.year || 3)}`,
    `Sem - ${formatRoman(meta.semester || 5)}`,
    `Academic Year: ${meta.academicYear || '2026-27'}`, '', '', ''
  ]);

  // Row 6: Grid Header Row 1 (Period Labels + Break + Lunch)
  rows.push([
    'Day',
    'I',
    'II',
    gridData.breakTime || '11.00 to 11.10',
    'III',
    'IV',
    gridData.lunchTime || '1.00 to 2.00',
    'V',
    'VI'
  ]);

  // Row 7: Grid Header Row 2 (Timings)
  rows.push([
    'Day',
    gridData.periodHeaders[0]?.time || '09.00 to 10.00',
    gridData.periodHeaders[1]?.time || '10.00 to 11.00',
    'BREAK',
    gridData.periodHeaders[2]?.time || '11.10 to 12.10',
    gridData.periodHeaders[3]?.time || '12.10 to 1.00',
    'LUNCH',
    gridData.periodHeaders[4]?.time || '2.00 to 3.00',
    gridData.periodHeaders[5]?.time || '3.00 to 4.00'
  ]);

  // Rows 8-13: Days (Monday to Saturday)
  for (const d of gridData.days) {
    rows.push([
      d.name,
      d.morning1 || '-',
      d.morning2 || '-',
      'BREAK',
      d.midMorning1 || '-',
      d.midMorning2 || '-',
      'LUNCH',
      d.afternoon1 || '-',
      d.afternoon2 || '-'
    ]);
  }

  // Row 14: Blank separator
  rows.push(['', '', '', '', '', '', '', '', '']);

  // Row 15: Subject Allocation Header
  rows.push(['Sl.No', 'Subject Code', 'Subject Name', '', 'Faculty Full Name', '', 'Phone No.', '', 'Hrs']);

  // Rows 16+: Subject rows
  for (const s of subjects) {
    rows.push([s.slNo, s.code, s.name, '', s.facultyName, '', s.phone, '', s.hours]);
  }

  // Blank row & Footer
  rows.push(['', '', '', '', '', '', '', '', '']);
  rows.push([`Doc.No: ${meta.docNo || '4'}`, '', '', '', '', '', '', '', '']);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Merge specifications for the exact template
  ws['!merges'] = [
    // Header title row 1 (A1:I1)
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    // School title row 2 (A2:I2)
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    // Row 3: TIME TABLE (A3:C3), Class Teacher (D3:F3), RoomNo (G3:I3)
    { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
    { s: { r: 2, c: 3 }, e: { r: 2, c: 5 } },
    { s: { r: 2, c: 6 }, e: { r: 2, c: 8 } },
    // Row 4: Ref No (A4:B4), Revision Date (F4:I4)
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 3, c: 5 }, e: { r: 3, c: 8 } },
    // Row 5: Course (A5:B5), Academic Year (F5:I5)
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 4, c: 5 }, e: { r: 4, c: 8 } },
    // Grid Header: Day column (A6:A7)
    { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } },
    // Break vertical merge (D7:D12)
    { s: { r: 6, c: 3 }, e: { r: 12, c: 3 } },
    // Lunch vertical merge (G7:G12)
    { s: { r: 6, c: 6 }, e: { r: 12, c: 6 } }
  ];

  // Set column widths
  ws['!cols'] = [
    { wch: 14 }, // Day / SlNo
    { wch: 18 }, // I / Subject Code
    { wch: 28 }, // II / Subject Name
    { wch: 16 }, // Break
    { wch: 22 }, // III / Faculty Name
    { wch: 18 }, // IV
    { wch: 16 }, // Lunch / Phone
    { wch: 20 }, // V
    { wch: 14 }  // VI / Hrs
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Official Timetable');
  const outName = filename || `${(meta.dept || 'Timetable').replace(/[^a-zA-Z0-9_-]/g, '_')}_Official_Timetable.xlsx`;
  XLSX.writeFile(wb, outName);
}

/**
 * Triggers standard browser print for the Official Template View
 */
export function printOfficialTimetable() {
  window.print();
}
