import { db, runInTransaction, writeThroughPg } from '../db/database';
import { ParsedTimetableEntity } from './types';

export interface DatabaseUpdateResult {
  sections: number;
  courses: number;
  teachers: number;
  rooms: number;
  activities: number;
  timetableEntries: number;
}

/**
 * Persists parsed timetable entities into SQLite & PostgreSQL cleanly and idempotently.
 */
export function updateDatabaseWithTimetables(
  timetables: ParsedTimetableEntity[],
  timetableId: string = 'tt-active'
): DatabaseUpdateResult {
  return runInTransaction(() => {
    let sectionsCount = 0;
    let coursesCount = 0;
    let teachersCount = 0;
    let roomsCount = 0;
    let activitiesCount = 0;
    let entriesCount = 0;

    // 1. Resolve Academic Year and Campus
    const currentAy = (db.prepare('SELECT id FROM academic_years WHERE is_current = 1').get() as any)?.id ||
                      (db.prepare('SELECT id FROM academic_years').get() as any)?.id || 'ay-2026-2027';

    const currentCampus = (db.prepare('SELECT id FROM campuses').get() as any)?.id || 'campus-main';
    const bldMain = 'bld-apollo-tech';

    // Ensure Main Building exists
    db.prepare(`
      INSERT INTO buildings (id, campus_id, name, code, total_floors)
      VALUES (?, ?, 'Apollo Technology Tower', 'APOLLO-TOW', 5)
      ON CONFLICT (id) DO NOTHING
    `).run(bldMain, currentCampus);

    writeThroughPg(`
      INSERT INTO buildings (id, campus_id, name, code, total_floors)
      VALUES (?, ?, 'Apollo Technology Tower', 'APOLLO-TOW', 5)
      ON CONFLICT (id) DO NOTHING
    `, [bldMain, currentCampus]);

    // Ensure Timetable record exists
    db.prepare(`
      INSERT INTO timetables (id, academic_year_id, name, status, generation_mode, created_by)
      VALUES (?, ?, 'The Apollo University Master Timetable', 'PUBLISHED', 'AUTOMATIC', 'Admin Coordinator')
      ON CONFLICT (id) DO NOTHING
    `).run(timetableId, currentAy);

    writeThroughPg(`
      INSERT INTO timetables (id, academic_year_id, name, status, generation_mode, created_by)
      VALUES (?, ?, 'The Apollo University Master Timetable', 'PUBLISHED', 'AUTOMATIC', 'Admin Coordinator')
      ON CONFLICT (id) DO NOTHING
    `, [timetableId, currentAy]);

    // Pre-cache existing IDs
    const existingDepts = new Map<string, string>();
    (db.prepare('SELECT id, code FROM departments').all() as any[]).forEach(d => {
      existingDepts.set(d.code.toUpperCase().trim(), d.id);
      existingDepts.set(d.id.toLowerCase().trim(), d.id);
    });

    const existingPrograms = new Map<string, string>();
    (db.prepare('SELECT id, department_id FROM programs').all() as any[]).forEach(p => {
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
    (db.prepare('SELECT id, name FROM sections').all() as any[]).forEach(s => {
      existingSections.set(s.name.toUpperCase().trim(), s.id);
    });

    const existingTeachers = new Map<string, string>();
    (db.prepare('SELECT id, name FROM teachers').all() as any[]).forEach(t => {
      existingTeachers.set(t.name.toLowerCase().trim(), t.id);
    });

    const existingCourses = new Map<string, string>();
    (db.prepare('SELECT id, code FROM courses').all() as any[]).forEach(c => {
      existingCourses.set(c.code.toUpperCase().trim(), c.id);
    });

    const existingRooms = new Map<string, string>();
    (db.prepare('SELECT id, code FROM rooms').all() as any[]).forEach(r => {
      existingRooms.set(r.code.toUpperCase().trim(), r.id);
    });

    // 2. Clear old entries for the affected sections in this timetable to prevent duplicates
    const targetSectionNames = Array.from(
      new Set(timetables.flatMap(t => t.sessions.flatMap(s => s.sectionNames)))
    );

    for (const secName of targetSectionNames) {
      const sId = existingSections.get(secName.toUpperCase());
      if (sId) {
        const actIds = (db.prepare(`
          SELECT activity_id FROM activity_student_assignments WHERE section_id = ?
        `).all(sId) as any[]).map(a => a.activity_id);

        if (actIds.length > 0) {
          const placeholders = actIds.map(() => '?').join(',');
          db.prepare(`DELETE FROM timetable_entries WHERE timetable_id = ? AND activity_id IN (${placeholders})`).run(timetableId, ...actIds);
          writeThroughPg(`DELETE FROM timetable_entries WHERE timetable_id = ? AND activity_id IN (${placeholders})`, [timetableId, ...actIds]);
        }
      }
    }

    // 3. Process each timetable sheet
    for (const tt of timetables) {
      const meta = tt.metadata;
      const { deptId, progId } = getDeptAndProg(meta.resolvedDeptCode);
      const yearNum = meta.resolvedYearNumber || 3;
      const batchId = `batch-${deptId.replace('dept-', '')}-y${yearNum}`;
      const semNumber = yearNum * 2 - 1; // e.g. Year 3 -> Sem 5
      const semId = `sem-${deptId.replace('dept-', '')}-${semNumber}`;

      // Ensure Department exists
      db.prepare(`
        INSERT INTO departments (id, faculty_id, name, code, head_of_department)
        VALUES (?, 'faculty-engineering', ?, ?, 'Head of Department')
        ON CONFLICT (id) DO NOTHING
      `).run(deptId, `Department of ${meta.resolvedDeptCode.toUpperCase()}`, meta.resolvedDeptCode.toUpperCase());

      writeThroughPg(`
        INSERT INTO departments (id, faculty_id, name, code, head_of_department)
        VALUES (?, 'faculty-engineering', ?, ?, 'Head of Department')
        ON CONFLICT (id) DO NOTHING
      `, [deptId, `Department of ${meta.resolvedDeptCode.toUpperCase()}`, meta.resolvedDeptCode.toUpperCase()]);

      // Ensure Program exists
      db.prepare(`
        INSERT INTO programs (id, department_id, name, code, degree, total_semesters)
        VALUES (?, ?, ?, ?, 'B.Tech', 8)
        ON CONFLICT (id) DO NOTHING
      `).run(progId, deptId, `B.Tech in ${meta.resolvedDeptCode.toUpperCase()}`, `BTECH-${meta.resolvedDeptCode.toUpperCase()}`);

      writeThroughPg(`
        INSERT INTO programs (id, department_id, name, code, degree, total_semesters)
        VALUES (?, ?, ?, ?, 'B.Tech', 8)
        ON CONFLICT (id) DO NOTHING
      `, [progId, deptId, `B.Tech in ${meta.resolvedDeptCode.toUpperCase()}`, `BTECH-${meta.resolvedDeptCode.toUpperCase()}`]);

      // Ensure Batch exists
      db.prepare(`
        INSERT INTO batches (id, program_id, academic_year_id, name, start_year, total_students)
        VALUES (?, ?, ?, ?, ?, 120)
        ON CONFLICT (id) DO NOTHING
      `).run(batchId, progId, currentAy, `Year ${yearNum} (${meta.resolvedDeptCode.toUpperCase()})`, 2026 - yearNum + 1);

      writeThroughPg(`
        INSERT INTO batches (id, program_id, academic_year_id, name, start_year, total_students)
        VALUES (?, ?, ?, ?, ?, 120)
        ON CONFLICT (id) DO NOTHING
      `, [batchId, progId, currentAy, `Year ${yearNum} (${meta.resolvedDeptCode.toUpperCase()})`, 2026 - yearNum + 1]);

      // Ensure Semester exists
      db.prepare(`
        INSERT INTO semesters (id, academic_year_id, program_id, semester_number, name, is_odd)
        VALUES (?, ?, ?, ?, ?, 1)
        ON CONFLICT (id) DO NOTHING
      `).run(semId, currentAy, progId, semNumber, `Semester ${semNumber}`);

      writeThroughPg(`
        INSERT INTO semesters (id, academic_year_id, program_id, semester_number, name, is_odd)
        VALUES (?, ?, ?, ?, ?, 1)
        ON CONFLICT (id) DO NOTHING
      `, [semId, currentAy, progId, semNumber, `Semester ${semNumber}`]);

      // Ensure Section exists
      const secName = meta.resolvedSectionName.toUpperCase();
      let sectionId = existingSections.get(secName);
      if (!sectionId) {
        sectionId = `sec-${secName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        db.prepare(`
          INSERT INTO sections (id, batch_id, semester_id, name, student_count)
          VALUES (?, ?, ?, ?, 60)
          ON CONFLICT (id) DO NOTHING
        `).run(sectionId, batchId, semId, secName);

        writeThroughPg(`
          INSERT INTO sections (id, batch_id, semester_id, name, student_count)
          VALUES (?, ?, ?, ?, 60)
          ON CONFLICT (id) DO NOTHING
        `, [sectionId, batchId, semId, secName]);

        existingSections.set(secName, sectionId);
        sectionsCount++;
      }

      // Upsert Subjects from subject table
      for (const subj of tt.subjectTable) {
        const cCode = subj.subjectCode || `CRS-${subj.normalizedSubjectName.replace(/[^A-Z0-9]/g, '').slice(0, 8)}`;
        let courseId = existingCourses.get(cCode);
        if (!courseId) {
          courseId = `crs-${cCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          const cType = subj.isLab ? 'LABORATORY' : 'LECTURE';
          const rType = subj.isLab ? 'COMPUTER_LAB' : 'CLASSROOM';

          db.prepare(`
            INSERT INTO courses (id, code, name, department_id, program_id, semester_number, credits, course_type, required_room_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET name = excluded.name
          `).run(courseId, cCode, subj.subjectName, deptId, progId, semNumber, subj.hoursPerWeek || 3, cType, rType);

          writeThroughPg(`
            INSERT INTO courses (id, code, name, department_id, program_id, semester_number, credits, course_type, required_room_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET name = excluded.name
          `, [courseId, cCode, subj.subjectName, deptId, progId, semNumber, subj.hoursPerWeek || 3, cType, rType]);

          existingCourses.set(cCode, courseId);
          coursesCount++;
        }

        // Upsert Teachers from subject table
        for (let tIdx = 0; tIdx < subj.facultyNames.length; tIdx++) {
          const tName = subj.facultyNames[tIdx];
          const tKey = tName.toLowerCase().trim();
          let tId = existingTeachers.get(tKey);
          if (!tId) {
            const cleanSlug = tName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || `fac${Date.now()}`;
            tId = `tch-${cleanSlug}`;
            const empId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
            const email = `${cleanSlug}@apollouniversity.edu.in`;
            const phone = subj.facultyPhones[tIdx] || subj.rawPhone || '';

            db.prepare(`
              INSERT INTO teachers (id, employee_id, name, email, phone, department_id, designation, max_hours_per_day, max_hours_per_week)
              VALUES (?, ?, ?, ?, ?, ?, 'Assistant Professor', 5, 20)
              ON CONFLICT (id) DO UPDATE SET phone = excluded.phone
            `).run(tId, empId, tName, email, phone, deptId);

            writeThroughPg(`
              INSERT INTO teachers (id, employee_id, name, email, phone, department_id, designation, max_hours_per_day, max_hours_per_week)
              VALUES (?, ?, ?, ?, ?, ?, 'Assistant Professor', 5, 20)
              ON CONFLICT (id) DO UPDATE SET phone = excluded.phone
            `, [tId, empId, tName, email, phone, deptId]);

            existingTeachers.set(tKey, tId);
            teachersCount++;
          }
        }
      }

      // 4. Insert Timetable Sessions & Activities
      const insertEntryStmt = db.prepare(`
        INSERT INTO timetable_entries (
          id, timetable_id, activity_id, day_of_week, period_index, duration, room_id, is_locked, satisfaction_explanation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
      `);

      for (let sIdx = 0; sIdx < tt.sessions.length; sIdx++) {
        const session = tt.sessions[sIdx];

        // Resolve Course
        let courseId = existingCourses.get(session.subjectCode);
        if (!courseId) {
          courseId = `crs-${session.subjectCode.toLowerCase().replace(/[^a-z0-9]/g, '') || ('c' + sIdx)}`;
          db.prepare(`
            INSERT INTO courses (id, code, name, department_id, program_id, semester_number, credits, course_type, required_room_type)
            VALUES (?, ?, ?, ?, ?, ?, 3, ?, ?)
            ON CONFLICT (id) DO NOTHING
          `).run(courseId, session.subjectCode, session.subjectName, deptId, progId, semNumber, session.activityType, session.activityType === 'LABORATORY' ? 'COMPUTER_LAB' : 'CLASSROOM');

          writeThroughPg(`
            INSERT INTO courses (id, code, name, department_id, program_id, semester_number, credits, course_type, required_room_type)
            VALUES (?, ?, ?, ?, ?, ?, 3, ?, ?)
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

          db.prepare(`
            INSERT INTO rooms (id, building_id, name, code, floor, capacity, room_type, is_accessible, department_id)
            VALUES (?, ?, ?, ?, 2, 70, ?, 1, ?)
            ON CONFLICT (id) DO NOTHING
          `).run(roomId, bldMain, `Room ${session.roomCode}`, session.roomCode, rType, deptId);

          writeThroughPg(`
            INSERT INTO rooms (id, building_id, name, code, floor, capacity, room_type, is_accessible, department_id)
            VALUES (?, ?, ?, ?, 2, 70, ?, 1, ?)
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

            db.prepare(`
              INSERT INTO teachers (id, employee_id, name, email, department_id, designation, max_hours_per_day, max_hours_per_week)
              VALUES (?, ?, ?, ?, ?, 'Faculty Instructor', 5, 20)
              ON CONFLICT (id) DO NOTHING
            `).run(tId, empId, tName, email, deptId);

            writeThroughPg(`
              INSERT INTO teachers (id, employee_id, name, email, department_id, designation, max_hours_per_day, max_hours_per_week)
              VALUES (?, ?, ?, ?, ?, 'Faculty Instructor', 5, 20)
              ON CONFLICT (id) DO NOTHING
            `, [tId, empId, tName, email, deptId]);

            existingTeachers.set(tKey, tId);
            teachersCount++;
          }
          resolvedTeacherIds.push(tId);
        }

        // Create Activity
        const actId = `act-${timetableId}-${secName.toLowerCase()}-${sIdx}-${Date.now()}`;
        const actName = `${session.subjectName} (${secName})`;

        db.prepare(`
          INSERT INTO activities (
            id, code, name, course_id, activity_type, duration_periods, occurrences_per_week, required_room_type
          ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        `).run(actId, `ACT-${session.subjectCode}-${sIdx}`, actName, courseId, session.activityType, session.duration, session.activityType === 'LABORATORY' ? 'COMPUTER_LAB' : 'CLASSROOM');

        writeThroughPg(`
          INSERT INTO activities (
            id, code, name, course_id, activity_type, duration_periods, occurrences_per_week, required_room_type
          ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        `, [actId, `ACT-${session.subjectCode}-${sIdx}`, actName, courseId, session.activityType, session.duration, session.activityType === 'LABORATORY' ? 'COMPUTER_LAB' : 'CLASSROOM']);

        activitiesCount++;

        // Activity - Teacher assignments
        for (const tId of resolvedTeacherIds) {
          const ataId = `ata-${actId}-${tId}`;
          db.prepare('INSERT INTO activity_teacher_assignments (id, activity_id, teacher_id) VALUES (?, ?, ?)').run(ataId, actId, tId);
          writeThroughPg('INSERT INTO activity_teacher_assignments (id, activity_id, teacher_id) VALUES (?, ?, ?)', [ataId, actId, tId]);
        }

        // Activity - Student assignments
        const sId = existingSections.get(secName) || sectionId;
        const asaId = `asa-${actId}-${sId}`;
        db.prepare('INSERT INTO activity_student_assignments (id, activity_id, section_id) VALUES (?, ?, ?)').run(asaId, actId, sId);
        writeThroughPg('INSERT INTO activity_student_assignments (id, activity_id, section_id) VALUES (?, ?, ?)', [asaId, actId, sId]);

        // Timetable Entry
        const entryId = `ent-${timetableId}-${secName.toLowerCase()}-${session.dayOfWeek}-${session.periodIndex}-${sIdx}`;
        const explanation = `Scheduled session for ${secName}: ${session.subjectName} with ${session.teacherNames.join(', ')} in ${session.roomCode}`;

        insertEntryStmt.run(
          entryId,
          timetableId,
          actId,
          session.dayOfWeek,
          session.periodIndex,
          session.duration,
          roomId,
          explanation
        );

        writeThroughPg(`
          INSERT INTO timetable_entries (
            id, timetable_id, activity_id, day_of_week, period_index, duration, room_id, is_locked, satisfaction_explanation
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
        `, [entryId, timetableId, actId, session.dayOfWeek, session.periodIndex, session.duration, roomId, explanation]);

        entriesCount++;
      }
    }

    return {
      sections: sectionsCount,
      courses: coursesCount,
      teachers: teachersCount,
      rooms: roomsCount,
      activities: activitiesCount,
      timetableEntries: entriesCount
    };
  });
}
