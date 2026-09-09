import nodemailer from 'nodemailer';

const isEmailConfigured =
  !!process.env.EMAIL_USER &&
  !!process.env.EMAIL_PASS &&
  process.env.EMAIL_USER !== 'your-email@outlook.com';

const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp-mail.outlook.com',
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!
      },
      tls: { ciphers: 'SSLv3' }
    })
  : null;

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIOD_TIMES: Record<number, string> = {
  0: '09:00-10:00',
  1: '10:00-11:00',
  2: '11:15-12:15',
  3: '12:15-13:15',
  4: '13:15-14:00 (Lunch)',
  5: '14:00-15:00',
  6: '15:00-16:00',
  7: '16:00-17:00'
};

export interface FacultyTimetablePayload {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  sessions: {
    dayOfWeek: number;
    periodIndex: number;
    courseName: string;
    courseCode: string;
    sectionNames: string[];
    roomCode: string;
    activityType: string;
    duration: number;
  }[];
}

function buildTimetableHtml(payload: FacultyTimetablePayload): string {
  const sessionsByDay: Record<number, typeof payload.sessions> = {};
  for (let d = 0; d < 6; d++) {
    sessionsByDay[d] = payload.sessions
      .filter(s => s.dayOfWeek === d)
      .sort((a, b) => a.periodIndex - b.periodIndex);
  }

  const sessionRows = Array.from({ length: 8 }, (_, p) => {
    const cells = DAY_NAMES.map((_, d) => {
      const sess = sessionsByDay[d]?.find(s => s.periodIndex === p);
      if (!sess) {
        return p === 4
          ? '<td style="background:#FFF9E6;color:#B8860B;font-size:11px;text-align:center;padding:10px 6px;font-style:italic;">Lunch Break</td>'
          : '<td style="background:#F9FBFC;color:#B0BEC5;text-align:center;font-size:11px;padding:10px 6px;">-</td>';
      }
      const color = sess.activityType === 'LABORATORY' ? '#E8F5E9' : sess.activityType === 'TUTORIAL' ? '#E3F2FD' : '#EBF4F7';
      const border = sess.activityType === 'LABORATORY' ? '#66BB6A' : sess.activityType === 'TUTORIAL' ? '#42A5F5' : '#2582A1';
      return `<td style="background:${color};padding:8px 6px;vertical-align:top;border-left:3px solid ${border};">
        <div style="font-weight:700;font-size:12px;color:#002E4E;">${sess.courseCode}</div>
        <div style="font-size:11px;color:#4A6375;margin-top:2px;">${sess.courseName}</div>
        <div style="font-size:10px;color:#2582A1;margin-top:3px;">${sess.sectionNames.join(', ')}</div>
        <div style="font-size:10px;color:#666;margin-top:2px;">Room: ${sess.roomCode}</div>
        ${sess.duration > 1 ? `<div style="font-size:10px;color:#E65100;margin-top:2px;">${sess.duration} periods</div>` : ''}
      </td>`;
    }).join('');
    return `<tr>
      <td style="background:#F0F6F9;font-size:11px;font-weight:600;color:#002E4E;padding:8px 10px;white-space:nowrap;border-right:1px solid #D8E6ED;">
        P${p + 1} <span style="font-weight:400;color:#829BA8;font-size:10px;">${PERIOD_TIMES[p] || ''}</span>
      </td>
      ${cells}
    </tr>`;
  }).join('');

  const dayHeaders = DAY_NAMES.map(d =>
    `<th style="background:#002E4E;color:white;font-size:12px;padding:10px 8px;min-width:110px;">${d}</th>`
  ).join('');

  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:Segoe UI,Arial,sans-serif;background:#F4F8FA;">
  <div style="max-width:900px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#002E4E,#1C5C7A);padding:28px 32px;color:white;">
      <div style="font-size:13px;color:#90CAE4;letter-spacing:1px;margin-bottom:6px;">THE APOLLO UNIVERSITY - SMART TIMETABLE SYSTEM</div>
      <h1 style="margin:0;font-size:22px;font-weight:700;">Weekly Teaching Schedule</h1>
      <div style="font-size:16px;margin-top:6px;color:#BCE1EE;">${payload.teacherName}</div>
      <div style="font-size:12px;color:#90CAE4;margin-top:4px;">Monday to Saturday | Academic Year 2026-2027</div>
    </div>
    <div style="display:flex;border-bottom:1px solid #D8E6ED;">
      <div style="flex:1;padding:16px 20px;border-right:1px solid #D8E6ED;">
        <div style="font-size:11px;color:#829BA8;text-transform:uppercase;">Total Sessions/Week</div>
        <div style="font-size:24px;font-weight:800;color:#002E4E;margin-top:4px;">${payload.sessions.length}</div>
      </div>
      <div style="flex:1;padding:16px 20px;border-right:1px solid #D8E6ED;">
        <div style="font-size:11px;color:#829BA8;text-transform:uppercase;">Sections Assigned</div>
        <div style="font-size:24px;font-weight:800;color:#002E4E;margin-top:4px;">${[...new Set(payload.sessions.flatMap(s => s.sectionNames))].length}</div>
      </div>
      <div style="flex:1;padding:16px 20px;">
        <div style="font-size:11px;color:#829BA8;text-transform:uppercase;">Dispatched On</div>
        <div style="font-size:12px;font-weight:600;color:#002E4E;margin-top:6px;">${now}</div>
      </div>
    </div>
    <div style="padding:20px;overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr>
          <th style="background:#002E4E;color:white;font-size:11px;padding:10px 8px;text-align:left;min-width:80px;">Period</th>
          ${dayHeaders}
        </tr></thead>
        <tbody>${sessionRows}</tbody>
      </table>
    </div>
    <div style="padding:14px 20px;border-top:1px solid #D8E6ED;display:flex;gap:16px;flex-wrap:wrap;">
      <span style="font-size:11px;color:#555;">Legend:</span>
      <span style="font-size:11px;color:#555;border-left:3px solid #2582A1;padding-left:6px;">Lecture</span>
      <span style="font-size:11px;color:#555;border-left:3px solid #66BB6A;padding-left:6px;">Laboratory</span>
      <span style="font-size:11px;color:#555;border-left:3px solid #42A5F5;padding-left:6px;">Tutorial</span>
    </div>
    <div style="background:#F4F8FA;padding:14px 20px;border-top:1px solid #D8E6ED;font-size:11px;color:#829BA8;text-align:center;">
      Auto-generated by The Apollo University Smart Scheduling System. For changes, contact Academic Coordination.
    </div>
  </div>
</body></html>`;
}

export interface DispatchResult {
  teacherId: string;
  teacherName: string;
  email: string;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
}

export async function dispatchTimetablesToFaculty(
  payloads: FacultyTimetablePayload[]
): Promise<{ results: DispatchResult[]; sent: number; failed: number; skipped: number }> {
  const results: DispatchResult[] = [];

  if (!transporter || !isEmailConfigured) {
    return {
      results: payloads.map(p => ({
        teacherId: p.teacherId,
        teacherName: p.teacherName,
        email: p.teacherEmail,
        status: 'skipped',
        error: 'Email SMTP not configured. Add EMAIL_USER and EMAIL_PASS to backend/.env'
      })),
      sent: 0,
      failed: 0,
      skipped: payloads.length
    };
  }

  for (const payload of payloads) {
    if (!payload.teacherEmail || !payload.teacherEmail.includes('@')) {
      results.push({ teacherId: payload.teacherId, teacherName: payload.teacherName, email: payload.teacherEmail, status: 'failed', error: 'Invalid email address' });
      continue;
    }
    try {
      const html = buildTimetableHtml(payload);
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || `Apollo University <${process.env.EMAIL_USER}>`,
        to: payload.teacherEmail,
        subject: `Your Weekly Teaching Schedule | Apollo University`,
        html
      });
      results.push({ teacherId: payload.teacherId, teacherName: payload.teacherName, email: payload.teacherEmail, status: 'sent' });
    } catch (err: any) {
      results.push({ teacherId: payload.teacherId, teacherName: payload.teacherName, email: payload.teacherEmail, status: 'failed', error: err.message || 'SMTP error' });
    }
  }

  const sent = results.filter(r => r.status === 'sent').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  return { results, sent, failed, skipped };
}

