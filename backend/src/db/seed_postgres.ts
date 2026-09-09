import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

export async function seedPostgres(force = true): Promise<void> {
  console.log('Seeding PostgreSQL database with The Apollo University clean dataset...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (force) {
      console.log('Cleaning existing records before seeding...');
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
          semesters,
          academic_years,
          programs,
          departments,
          faculties,
          campuses,
          universities,
          users
        CASCADE;
      `);
    }

    // 1. Users & Authentication
    console.log('1. Inserting Super Administrator...');
    const dynamicHash = crypto.scryptSync('Admin@1234', 'apollo_salt_2026', 64).toString('hex');
    const finalAdminHash = `scrypt$apollo_salt_2026$${dynamicHash}`;

    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role, department_id, teacher_id, student_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash`,
      ['user-admin-main', 'Apollo Super Admin', 'admin@apollouniversity.edu.in', finalAdminHash, 'SUPER_ADMIN', null, null, null]
    );

    // 2. Universities & Hierarchy
    console.log('2. Inserting University Hierarchy...');
    const univId = 'univ-apollo';
    await client.query(
      `INSERT INTO universities (id, name, code, address)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [univId, 'The Apollo University', 'APOLLO', 'Apollo Knowledge City, Murukambattu, Chittoor - 517127, AP, India']
    );

    const campus1 = 'camp-main';
    await client.query(
      `INSERT INTO campuses (id, university_id, name, code, location) VALUES 
       ($1, $2, 'Apollo Tech & Innovation Campus', 'APOLLO-TECH', 'Academic Complex')
       ON CONFLICT (id) DO NOTHING`,
      [campus1, univId]
    );

    const facTech = 'fac-sot';
    await client.query(
      `INSERT INTO faculties (id, campus_id, name, code, dean_name) VALUES 
       ($1, $2, 'School of Technology (SoT)', 'SOT', 'Dean of Engineering & Technology')
       ON CONFLICT (id) DO NOTHING`,
      [facTech, campus1]
    );

    // 3. Requested Departments:
    // 1. Computer science engineering (sections: CSE-A, CSE-B, CSE-C)
    // 2. Artificial Intelligence and Data Science (sections: AIDS-A, AIDS-B)
    // 3. Artificial Intelligence and Machine learning (sections: AIML-A, AIML-B)
    // 4. Cyber Security (sections: CS-A, CS-B)
    const deptCse = 'dept-cse';
    const deptAids = 'dept-aids';
    const deptAiml = 'dept-aiml';
    const deptCs = 'dept-cs';

    await client.query(
      `INSERT INTO departments (id, faculty_id, name, code, head_of_department) VALUES 
       ($1, $5, 'Computer Science & Engineering', 'CSE', 'HOD Computer Science'),
       ($2, $5, 'Artificial Intelligence and Data Science', 'AIDS', 'HOD AI & Data Science'),
       ($3, $5, 'Artificial Intelligence and Machine Learning', 'AIML', 'HOD AI & Machine Learning'),
       ($4, $5, 'Cyber Security', 'CS', 'HOD Cyber Security')
       ON CONFLICT (id) DO NOTHING`,
      [deptCse, deptAids, deptAiml, deptCs, facTech]
    );

    // 4. Programs
    const progCse = 'prog-btech-cse';
    const progAids = 'prog-btech-aids';
    const progAiml = 'prog-btech-aiml';
    const progCs = 'prog-btech-cs';

    await client.query(
      `INSERT INTO programs (id, department_id, name, code, degree, total_semesters) VALUES 
       ($1, $2, 'B.Tech in Computer Science & Engineering', 'BTECH-CSE', 'Bachelor of Technology', 8),
       ($3, $4, 'B.Tech in Artificial Intelligence and Data Science', 'BTECH-AIDS', 'Bachelor of Technology', 8),
       ($5, $6, 'B.Tech in Artificial Intelligence and Machine Learning', 'BTECH-AIML', 'Bachelor of Technology', 8),
       ($7, $8, 'B.Tech in Cyber Security', 'BTECH-CS', 'Bachelor of Technology', 8)
       ON CONFLICT (id) DO NOTHING`,
      [progCse, deptCse, progAids, deptAids, progAiml, deptAiml, progCs, deptCs]
    );

    // 5. Academic Year & Semesters
    const ayCurrent = 'ay-2026-2027';
    await client.query(
      `INSERT INTO academic_years (id, university_id, name, start_date, end_date, is_current)
       VALUES ($1, $2, 'Academic Year 2026–2027', '2026-08-01', '2026-12-20', 1)
       ON CONFLICT (id) DO NOTHING`,
      [ayCurrent, univId]
    );

    const semCse = 'sem-cse-3';
    const semAids = 'sem-aids-3';
    const semAiml = 'sem-aiml-3';
    const semCs = 'sem-cs-3';

    await client.query(
      `INSERT INTO semesters (id, academic_year_id, program_id, semester_number, name, is_odd) VALUES 
       ($1, $2, $3, 3, 'Semester 3 (CSE)', 1),
       ($4, $2, $5, 3, 'Semester 3 (AI&DS)', 1),
       ($6, $2, $7, 3, 'Semester 3 (AI&ML)', 1),
       ($8, $2, $9, 3, 'Semester 3 (Cyber Security)', 1)
       ON CONFLICT (id) DO NOTHING`,
      [semCse, ayCurrent, progCse, semAids, progAids, semAiml, progAiml, semCs, progCs]
    );

    // 6. Batches & Sections
    const batchCse = 'batch-cse-2025';
    const batchAids = 'batch-aids-2025';
    const batchAiml = 'batch-aiml-2025';
    const batchCs = 'batch-cs-2025';

    await client.query(
      `INSERT INTO batches (id, program_id, academic_year_id, name, start_year, total_students) VALUES 
       ($1, $2, $3, 'CSE 2025-2029', 2025, 180),
       ($4, $5, $3, 'AI&DS 2025-2029', 2025, 120),
       ($6, $7, $3, 'AI&ML 2025-2029', 2025, 120),
       ($8, $9, $3, 'Cyber Security 2025-2029', 2025, 120)
       ON CONFLICT (id) DO NOTHING`,
      [batchCse, progCse, ayCurrent, batchAids, progAids, batchAiml, progAiml, batchCs, progCs]
    );

    const sections = [
      { id: 'sec-cse-a', batchId: batchCse, semId: semCse, name: 'CSE-A', count: 60 },
      { id: 'sec-cse-b', batchId: batchCse, semId: semCse, name: 'CSE-B', count: 60 },
      { id: 'sec-cse-c', batchId: batchCse, semId: semCse, name: 'CSE-C', count: 60 },
      { id: 'sec-aids-a', batchId: batchAids, semId: semAids, name: 'AIDS-A', count: 60 },
      { id: 'sec-aids-b', batchId: batchAids, semId: semAids, name: 'AIDS-B', count: 60 },
      { id: 'sec-aiml-a', batchId: batchAiml, semId: semAiml, name: 'AIML-A', count: 60 },
      { id: 'sec-aiml-b', batchId: batchAiml, semId: semAiml, name: 'AIML-B', count: 60 },
      { id: 'sec-cs-a', batchId: batchCs, semId: semCs, name: 'CS-A', count: 60 },
      { id: 'sec-cs-b', batchId: batchCs, semId: semCs, name: 'CS-B', count: 60 }
    ];

    for (const sec of sections) {
      await client.query(
        `INSERT INTO sections (id, batch_id, semester_id, name, student_count)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [sec.id, sec.batchId, sec.semId, sec.name, sec.count]
      );
    }

    // 7. Rooms & Venues
    const bldMain = 'bld-apollo-tech';
    await client.query(
      `INSERT INTO buildings (id, campus_id, name, code, total_floors)
       VALUES ($1, $2, 'Apollo Technology Tower', 'APOLLO-TOW', 5)
       ON CONFLICT (id) DO NOTHING`,
      [bldMain, campus1]
    );

    const rooms = [
      { id: 'room-aud-101', name: 'Main Auditorium (150 Seats)', code: 'AUD-101', floor: 1, cap: 150, type: 'LECTURE_HALL' },
      { id: 'room-aud-102', name: 'Seminar Hall (100 Seats)', code: 'AUD-102', floor: 1, cap: 100, type: 'LECTURE_HALL' },
      { id: 'room-cr-201', name: 'Classroom CR-201', code: 'CR-201', floor: 2, cap: 70, type: 'CLASSROOM' },
      { id: 'room-cr-202', name: 'Classroom CR-202', code: 'CR-202', floor: 2, cap: 70, type: 'CLASSROOM' },
      { id: 'room-cr-203', name: 'Classroom CR-203', code: 'CR-203', floor: 2, cap: 70, type: 'CLASSROOM' },
      { id: 'room-cr-301', name: 'Classroom CR-301', code: 'CR-301', floor: 3, cap: 70, type: 'CLASSROOM' },
      { id: 'room-cr-302', name: 'Classroom CR-302', code: 'CR-302', floor: 3, cap: 70, type: 'CLASSROOM' },
      { id: 'room-cr-303', name: 'Classroom CR-303', code: 'CR-303', floor: 3, cap: 70, type: 'CLASSROOM' },
      { id: 'room-lab-1', name: 'Computer Science Lab 1', code: 'LAB-CSE-1', floor: 4, cap: 40, type: 'COMPUTER_LAB' },
      { id: 'room-lab-2', name: 'AI & Data Science Lab 2', code: 'LAB-AIDS-2', floor: 4, cap: 40, type: 'COMPUTER_LAB' },
      { id: 'room-lab-3', name: 'Machine Learning & GPU Lab 3', code: 'LAB-AIML-3', floor: 4, cap: 40, type: 'COMPUTER_LAB' },
      { id: 'room-lab-4', name: 'Cyber Security & Forensics Lab', code: 'LAB-CYBER-4', floor: 5, cap: 40, type: 'COMPUTER_LAB' }
    ];

    for (const r of rooms) {
      await client.query(
        `INSERT INTO rooms (id, building_id, name, code, floor, capacity, room_type, is_accessible, department_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, bldMain, r.name, r.code, r.floor, r.cap, r.type, deptCse]
      );
    }

    // 8. Time Slots (Monday - Saturday, 7 periods per day + 1 lunch break)
    const days = [
      { dayOfWeek: 0, name: 'Monday' },
      { dayOfWeek: 1, name: 'Tuesday' },
      { dayOfWeek: 2, name: 'Wednesday' },
      { dayOfWeek: 3, name: 'Thursday' },
      { dayOfWeek: 4, name: 'Friday' },
      { dayOfWeek: 5, name: 'Saturday' }
    ];

    const periodTemplates = [
      { index: 0, start: '09:00', end: '10:00', isBreak: 0, label: 'Period 1' },
      { index: 1, start: '10:00', end: '11:00', isBreak: 0, label: 'Period 2' },
      { index: 2, start: '11:15', end: '12:15', isBreak: 0, label: 'Period 3' },
      { index: 3, start: '12:15', end: '13:15', isBreak: 0, label: 'Period 4' },
      { index: 4, start: '13:15', end: '14:00', isBreak: 1, label: 'Lunch Break' },
      { index: 5, start: '14:00', end: '15:00', isBreak: 0, label: 'Period 5' },
      { index: 6, start: '15:00', end: '16:00', isBreak: 0, label: 'Period 6' },
      { index: 7, start: '16:00', end: '17:00', isBreak: 0, label: 'Period 7' }
    ];

    for (const d of days) {
      for (const p of periodTemplates) {
        const slotId = `slot-${d.dayOfWeek}-${p.index}`;
        await client.query(
          `INSERT INTO time_slots (id, day_of_week, day_name, period_index, start_time, end_time, is_break, label)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING`,
          [slotId, d.dayOfWeek, d.name, p.index, p.start, p.end, p.isBreak, p.label]
        );
      }
    }

    // 9. Active Timetable Container
    const ttActiveId = 'tt-active';
    await client.query(
      `INSERT INTO timetables (id, academic_year_id, name, version, status, generation_mode, created_by)
       VALUES ($1, $2, 'The Apollo University — Official Timetable', 1, 'PUBLISHED', 'MANUAL', 'admin-root')
       ON CONFLICT (id) DO NOTHING`,
      [ttActiveId, ayCurrent]
    );

    await client.query('COMMIT');
    console.log('✓ PostgreSQL seeding completed successfully with clean state.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed PostgreSQL database:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedPostgres(true).then(() => pool.end());
}
