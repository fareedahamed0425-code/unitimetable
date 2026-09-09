const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function wipeAll() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('1. Truncating all operational scheduling tables...');
    await client.query(`
      TRUNCATE TABLE 
        uploaded_files,
        fet_import_history,
        audit_logs,
        generation_jobs,
        conflicts,
        timetable_versions,
        timetable_entries,
        timetables,
        smart_preference_rules,
        preference_profiles,
        entity_availability,
        activity_relations,
        activity_required_equipment,
        activity_student_assignments,
        activity_teacher_assignments,
        activities,
        course_required_equipment,
        courses,
        time_slots,
        room_equipment,
        equipment,
        rooms,
        buildings,
        students,
        teacher_qualifications,
        teachers,
        student_subgroups,
        student_groups,
        sections,
        batches,
        semesters
      CASCADE;
    `);
    console.log('✓ All timetables, entries, conflicts, activities, courses, faculty, rooms, batches, and time periods wiped cleanly.');

    // 2. Ensure Universities, Campuses, Faculties, and the 4 Core Departments
    console.log('2. Ensuring base structural entities...');
    const univId = 'univ-apollo';
    await client.query(`
      INSERT INTO universities (id, name, code, address)
      VALUES ($1, 'The Apollo University', 'APOLLO', 'Apollo Knowledge City, Murukambattu, Chittoor - 517127, AP, India')
      ON CONFLICT (id) DO NOTHING
    `, [univId]);

    const campusId = 'camp-main';
    await client.query(`
      INSERT INTO campuses (id, university_id, name, code, location)
      VALUES ($1, $2, 'Apollo Tech & Innovation Campus', 'APOLLO-TECH', 'Academic Complex')
      ON CONFLICT (id) DO NOTHING
    `, [campusId, univId]);

    const facId = 'fac-sot';
    await client.query(`
      INSERT INTO faculties (id, campus_id, name, code, dean_name)
      VALUES ($1, $2, 'School of Technology (SoT)', 'SOT', 'Dean of Engineering & Technology')
      ON CONFLICT (id) DO NOTHING
    `, [facId, campusId]);

    const depts = [
      { id: 'dept-cse', name: 'Computer Science & Engineering', code: 'CSE' },
      { id: 'dept-aids', name: 'Artificial Intelligence and Data Science', code: 'AI&DS' },
      { id: 'dept-aiml', name: 'Artificial Intelligence and Machine Learning', code: 'AI&ML' },
      { id: 'dept-cs', name: 'Cyber Security', code: 'CS' }
    ];
    for (const d of depts) {
      await client.query(`
        INSERT INTO departments (id, faculty_id, name, code)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, code=EXCLUDED.code
      `, [d.id, facId, d.name, d.code]);
    }

    // 3. Ensure Academic Year
    await client.query(`
      INSERT INTO academic_years (id, university_id, name, start_date, end_date, is_current)
      VALUES ('ay-2026', $1, 'Academic Year 2026-2027', '2026-07-01', '2027-06-30', 1)
      ON CONFLICT (id) DO NOTHING
    `, [univId]);

    // 4. Create empty Clean Master Timetable
    const ttId = 'tt-apollo-master-2026';
    await client.query(`
      INSERT INTO timetables (id, academic_year_id, department_id, name, version, status, generation_mode, created_by)
      VALUES ($1, 'ay-2026', 'dept-cse', 'The Apollo University — Master Schedule 2026-2027', 1, 'DRAFT', 'AUTOMATIC', 'user-admin-main')
      ON CONFLICT (id) DO NOTHING
    `, [ttId]);

    await client.query('COMMIT');
    console.log('✓ Success! Database is completely wiped and ready for your new periods, rooms, faculty, and schedules.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Wipe failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

wipeAll();
