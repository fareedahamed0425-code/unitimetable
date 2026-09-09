import { pgQuery, pgExecute, pgTransaction } from '../db/database';
import { ParsedTimetableEntity, TimePeriodSlot } from './types';

export interface DatabaseUpdateResult {
  sections: number;
  courses: number;
  teachers: number;
  rooms: number;
  activities: number;
  timetableEntries: number;
  timeSlotsUpserted?: number;
}

/**
 * Syncs extracted period slots from an uploaded timetable into the time_slots table.
 * This ensures Academic Settings and the timetable grid both reflect the same timings.
 */
async function syncTimeSlotsFromParsed(
  client: any,
  timetables: ParsedTimetableEntity[]
): Promise<number> {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let upsertCount = 0;

  for (const tt of timetables) {
    const yearNum = tt.metadata.resolvedYearNumber || 1;

    // Collect unique periods from the parsed sheet (colIndex 0 = Day label column, skip)
    // periods contains the header-row period slots with their extracted times
    const periods: TimePeriodSlot[] = tt.periods || [];
    if (!periods.length) continue;

    // We sync the same period structure across all 6 weekdays for this year
    for (let d = 0; d < 6; d++) {
      for (const slot of periods) {
        const slotId = `ts-y${yearNum}-d${d}-p${slot.periodNumber}`;
        const isBreakOrLunch = slot.isBreak || slot.isLunch;
        const isBreakInt = isBreakOrLunch ? 1 : 0;
        const label = slot.isBreak
          ? 'Break'
          : slot.isLunch
            ? 'Lunch Break'
            : slot.periodLabel || `Period ${slot.periodNumber}`;

        await client.query(
          `INSERT INTO time_slots (id, day_of_week, day_name, period_index, start_time, end_time, is_break, label, year_number)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             start_time = EXCLUDED.start_time,
             end_time   = EXCLUDED.end_time,
             is_break   = EXCLUDED.is_break,
             label      = EXCLUDED.label`,
          [
            slotId,
            d,
            dayNames[d],
            slot.periodNumber,
            slot.startTime,
            slot.endTime,
            isBreakInt,
            label,
            yearNum
          ]
        );
        upsertCount++;
      }
    }
  }

  return upsertCount;
}

/**
 * Persists parsed timetable entities into Neon PostgreSQL cleanly and idempotently.
 */
export async function updateDatabaseWithTimetables(
  timetables: ParsedTimetableEntity[],
  timetableId: string = 'tt-active',
  clearExisting: boolean = true
): Promise<DatabaseUpdateResult> {
  return pgTransaction(async (client) => {
    let sectionsCount = 0;
    let coursesCount = 0;
    let teachersCount = 0;
    let roomsCount = 0;
    let activitiesCount = 0;
    let entriesCount = 0;

    const q = (sql: string, params?: any[]) => client.query(sql, params);

    // 0. Clear existing entries if requested
    if (clearExisting) {
      await q('DELETE FROM timetable_entries WHERE timetable_id = $1', [timetableId]);
      await q('DELETE FROM conflicts WHERE timetable_id = $1', [timetableId]);
    }

    // 1. Resolve Academic Year and Campus
    const ayRow = await q('SELECT id FROM academic_years WHERE is_current = 1');
    const ayRow2 = ayRow.rows.length === 0 ? await q('SELECT id FROM academic_years LIMIT 1') : ayRow;
    const currentAy = ayRow2.rows[0]?.id || 'ay-2026-2027';

    const campusRow = await q('SELECT id FROM campuses LIMIT 1');
    const currentCampus = campusRow.rows[0]?.id || 'campus-main';
    const bldMain = 'bld-apollo-tech';

    // Ensure Main Building exists
    await q(`
      INSERT INTO buildings (id, campus_id, name, code, total_floors)
      VALUES ($1, $2, 'Apollo Technology Tower', 'APOLLO-TOW', 5)
      ON CONFLICT (id) DO NOTHING
    `, [bldMain, currentCampus]);

    // Ensure Timetable record exists
    await q(`
      INSERT INTO timetables (id, academic_year_id, name, status, generation_mode, created_by)
      VALUES ($1, $2, 'The Apollo University Master Timetable', 'PUBLISHED', 'AUTOMATIC', 'Admin Coordinator')
      ON CONFLICT (id) DO NOTHING
    `, [timetableId, currentAy]);

    // Pre-cache existing IDs
    const existingDepts = new Map<string, string>();
    (await q('SELECT id, code FROM departments')).rows.forEach((d: any) => {
      existingDepts.set(d.code.toUpperCase().trim(), d.id);
      existingDepts.set(d.id.toLowerCase().trim(), d.id);
    });

    const existingPrograms = new Map<string, string>();
    (await q('SELECT id, department_id FROM programs')).rows.forEach((p: any) => {
      existingPrograms.set(p.department_id, p.id);
      existingPrograms.set(p.id, p.id);
    });

    const getDeptAndProg = (deptCode: string): { deptId: string; progId: string } => {
      const upper = deptCode.toUpperCase();
      let dKey = 'CSE';
      if (upper.includes('AIML')) dKey = 'AIML';
      else if (upper.includes('AIDS')) dKey = 'AIDS';
      else if (upper.includes('CS') || upper.includes('CYBER')) dKey = 'CS';

      const deptId = existingDepts.get(dKey) || `dept-${dKey.toLowerCase()}`;
      const progId = existingPrograms.get(deptId) || `prog-${dKey.toLowerCase()}`;
      return { deptId, progId };
    };

    const existingSections = new Map<string, string>();
    (await q('SELECT id, name FROM sections')).rows.forEach((s: any) => {
      existingSections.set(s.name.toUpperCase().trim(), s.id);
    });

    const existingTeachers = new Map<string, string>();
    (await q('SELECT id, name FROM teachers')).rows.forEach((t: any) => {
      existingTeachers.set(t.name.toLowerCase().trim(), t.id);
    });

    const existingCourses = new Map<string, string>();
    (await q('SELECT id, code FROM courses')).rows.forEach((c: any) => {
      existingCourses.set(c.code.toUpperCase().trim(), c.id);
    });

    const existingRooms = new Map<string, string>();
    (await q('SELECT id, code FROM rooms')).rows.forEach((r: any) => {
      existingRooms.set(r.code.toUpperCase().trim(), r.id);
    });

    // If not clearExisting, clear old entries for the affected sections
    if (!clearExisting) {
      const targetSectionNames = Array.from(
        new Set(timetables.flatMap(t => t.sessions.flatMap(s => s.sectionNames)))
      );
      for (const secName of targetSectionNames) {
        const sId = existingSections.get(secName.toUpperCase());
        if (sId) {
          const actRows = await q(
            'SELECT activity_id FROM activity_student_assignments WHERE section_id = $1', [sId]
          );
          const actIds = actRows.rows.map((a: any) => a.activity_id);
          if (actIds.length > 0) {
            const placeholders = actIds.map((_: any, i: number) => `$${i + 2}`).join(',');
            await q(`DELETE FROM timetable_entries WHERE timetable_id = $1 AND activity_id IN (${placeholders})`, [timetableId, ...actIds]);
          }
        }
      }
    }

    // 3. Process each timetable sheet
    for (const tt of timetables) {
      const meta = tt.metadata;
      const { deptId, progId } = getDeptAndProg(meta.resolvedDeptCode);
      const yearNum = meta.resolvedYearNumber || 3;
      const batchId = `batch-${deptId.replace('dept-', '')}-y${yearNum}`;
      const semNumber = yearNum * 2 - 1;
      const semId = `sem-${deptId.replace('dept-', '')}-${semNumber}`;

      // Ensure Department
      await q(`
        INSERT INTO departments (id, faculty_id, name, code, head_of_department)
        VALUES ($1, 'faculty-engineering', $2, $3, 'Head of Department')
        ON CONFLICT (id) DO NOTHING
      `, [deptId, `Department of ${meta.resolvedDeptCode.toUpperCase()}`, meta.resolvedDeptCode.toUpperCase()]);

      // Ensure Program
      await q(`
        INSERT INTO programs (id, department_id, name, code, degree, total_semesters)
        VALUES ($1, $2, $3, $4, 'B.Tech', 8)
        ON CONFLICT (id) DO NOTHING
      `, [progId, deptId, `B.Tech in ${meta.resolvedDeptCode.toUpperCase()}`, `BTECH-${meta.resolvedDeptCode.toUpperCase()}`]);

      // Ensure Batch
      await q(`
        INSERT INTO batches (id, program_id, academic_year_id, name, start_year, total_students)
        VALUES ($1, $2, $3, $4, $5, 120)
        ON CONFLICT (id) DO NOTHING
      `, [batchId, progId, currentAy, `Year ${yearNum} (${meta.resolvedDeptCode.toUpperCase()})`, 2026 - yearNum + 1]);

      // Ensure Semester
      await q(`
        INSERT INTO semesters (id, academic_year_id, program_id, semester_number, name, is_odd)
        VALUES ($1, $2, $3, $4, $5, 1)
        ON CONFLICT (id) DO NOTHING
      `, [semId, currentAy, progId, semNumber, `Semester ${semNumber}`]);

      // Ensure Section
      const secName = meta.resolvedSectionName.toUpperCase();
      let sectionId = existingSections.get(secName);
      if (!sectionId) {
        sectionId = `sec-${secName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        await q(`
          INSERT INTO sections (id, batch_id, semester_id, name, student_count)
          VALUES ($1, $2, $3, $4, 60)
          ON CONFLICT (id) DO NOTHING
        `, [sectionId, batchId, semId, secName]);
        existingSections.set(secName, sectionId);
        sectionsCount++;
      }

      // Upsert subjects
      for (const subj of tt.subjectTable) {
        const cCode = subj.subjectCode || `CRS-${subj.normalizedSubjectName.replace(/[^A-Z0-9]/g, '').slice(0, 8)}`;
        let courseId = existingCourses.get(cCode);
        if (!courseId) {
          courseId = `crs-${cCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          const cType = subj.isLab ? 'LABORATORY' : 'LECTURE';
          const rType = subj.isLab ? 'COMPUTER_LAB' : 'CLASSROOM';
          await q(`
            INSERT INTO courses (id, code, name, department_id, program_id, semester_number, credits, course_type, required_room_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
          `, [courseId, cCode, subj.subjectName, deptId, progId, semNumber, subj.hoursPerWeek || 3, cType, rType]);
          existingCourses.set(cCode, courseId);
          coursesCount++;
        }

        for (let tIdx = 0; tIdx < subj.facultyNames.length; tIdx++) {
          const tName = subj.facultyNames[tIdx];
          const tKey = tName.toLowerCase().trim();
          if (!existingTeachers.has(tKey)) {
            const cleanSlug = tName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || `fac${Date.now()}`;
            const tId = `tch-${cleanSlug}`;
            const empId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
            const email = `${cleanSlug}@apollouniversity.edu.in`;
            const phone = subj.facultyPhones[tIdx] || subj.rawPhone || '';
            await q(`
              INSERT INTO teachers (id, employee_id, name, email, phone, department_id, designation, max_hours_per_day, max_hours_per_week)
              VALUES ($1, $2, $3, $4, $5, $6, 'Assistant Professor', 5, 20)
              ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone
            `, [tId, empId, tName, email, phone, deptId]);
            existingTeachers.set(tKey, tId);
            teachersCount++;
          }
        }
      }

      // Sessions
      for (let sIdx = 0; sIdx < tt.sessions.length; sIdx++) {
        const session = tt.sessions[sIdx];

        // Resolve Course
        let courseId = existingCourses.get(session.subjectCode);
        if (!courseId) {
          courseId = `crs-${session.subjectCode.toLowerCase().replace(/[^a-z0-9]/g, '') || ('c' + sIdx)}`;
          await q(`
            INSERT INTO courses (id, code, name, department_id, program_id, semester_number, credits, course_type, required_room_type)
            VALUES ($1, $2, $3, $4, $5, $6, 3, $7, $8)
            ON CONFLICT (id) DO NOTHING
          `, [courseId, session.subjectCode, session.subjectName, deptId, progId, semNumber, session.activityType, session.activityType === 'LABORATORY' ? 'COMPUTER_LAB' : 'CLASSROOM']);
          existingCourses.set(session.subjectCode, courseId);
          coursesCount++;
        }

        // Resolve Room
        let roomId = existingRooms.get(session.roomCode);
        if (!roomId) {
          roomId = `room-${session.roomCode.toLowerCase().replace(/[^a-z0-9]/g, '') || ('r' + sIdx)}`;
          const rType = session.activityType === 'LABORATORY' || session.roomCode.includes('LAB') ? 'COMPUTER_LAB' : 'CLASSROOM';
          await q(`
            INSERT INTO rooms (id, building_id, name, code, floor, capacity, room_type, is_accessible, department_id)
            VALUES ($1, $2, $3, $4, 2, 70, $5, 1, $6)
            ON CONFLICT (id) DO NOTHING
          `, [roomId, bldMain, `Room ${session.roomCode}`, session.roomCode, rType, deptId]);
          existingRooms.set(session.roomCode, roomId);
          roomsCount++;
        }

        // Resolve Teachers
        const resolvedTeacherIds: string[] = [];
        for (const tName of session.teacherNames) {
          const tKey = tName.toLowerCase().trim();
          let tId = existingTeachers.get(tKey);
          if (!tId) {
            const cleanSlug = tName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || `tch${sIdx}`;
            tId = `tch-${cleanSlug}`;
            const empId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
            const email = `${cleanSlug}@apollouniversity.edu.in`;
            await q(`
              INSERT INTO teachers (id, employee_id, name, email, department_id, designation, max_hours_per_day, max_hours_per_week)
              VALUES ($1, $2, $3, $4, $5, 'Faculty Instructor', 5, 20)
              ON CONFLICT (id) DO NOTHING
            `, [tId, empId, tName, email, deptId]);
            existingTeachers.set(tKey, tId);
            teachersCount++;
          }
          resolvedTeacherIds.push(tId);
        }

        // Create Activity
        const sheetSlug = tt.sheetName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const randomToken = Math.random().toString(36).slice(2, 8);
        const actId = `act-${timetableId}-${sheetSlug}-${session.dayOfWeek}-${session.periodIndex}-${sIdx}-${randomToken}`;
        const actName = `${session.subjectName} (${secName})`;

        await q(`
          INSERT INTO activities (id, code, name, course_id, activity_type, duration_periods, occurrences_per_week, required_room_type)
          VALUES ($1, $2, $3, $4, $5, $6, 1, $7)
          ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
        `, [actId, `ACT-${session.subjectCode}-${sheetSlug}-${sIdx}`, actName, courseId, session.activityType, session.duration, session.activityType === 'LABORATORY' ? 'COMPUTER_LAB' : 'CLASSROOM']);
        activitiesCount++;

        // Teacher assignments
        for (const tId of resolvedTeacherIds) {
          const ataId = `ata-${actId}-${tId}`;
          await q('INSERT INTO activity_teacher_assignments (id, activity_id, teacher_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING', [ataId, actId, tId]);
        }

        // Student section assignments
        const sId = existingSections.get(secName) || sectionId;
        const asaId = `asa-${actId}-${sId}`;
        await q('INSERT INTO activity_student_assignments (id, activity_id, section_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING', [asaId, actId, sId]);

        // Timetable Entry
        const entryId = `ent-${timetableId}-${sheetSlug}-${session.dayOfWeek}-${session.periodIndex}-${sIdx}-${randomToken}`;
        const explanation = `Scheduled session for ${secName}: ${session.subjectName} with ${session.teacherNames.join(', ')} in ${session.roomCode}`;

        await q(`
          INSERT INTO timetable_entries (id, timetable_id, activity_id, day_of_week, period_index, duration, room_id, is_locked, satisfaction_explanation)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8)
          ON CONFLICT (id) DO UPDATE SET
            activity_id = EXCLUDED.activity_id,
            day_of_week = EXCLUDED.day_of_week,
            period_index = EXCLUDED.period_index,
            duration = EXCLUDED.duration,
            room_id = EXCLUDED.room_id,
            satisfaction_explanation = EXCLUDED.satisfaction_explanation
        `, [entryId, timetableId, actId, session.dayOfWeek, session.periodIndex, session.duration, roomId, explanation]);

        entriesCount++;
      }
    }

    // ✅ Sync extracted period timings → time_slots (so Settings panel & grid both match the upload)
    const timeSlotsUpserted = await syncTimeSlotsFromParsed(client, timetables);

    return {
      sections: sectionsCount,
      courses: coursesCount,
      teachers: teachersCount,
      rooms: roomsCount,
      activities: activitiesCount,
      timetableEntries: entriesCount,
      timeSlotsUpserted
    };
  });
}

