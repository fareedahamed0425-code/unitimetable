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
  console.log('Seeding PostgreSQL database with The Apollo University dataset...');
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

    // 1. Users & Authentication (Official Cleaned Credentials)
    console.log('1. Inserting Users & Official Admin credentials...');
    const adminPasswordHash = 'scrypt$a8f9c1b3e5d74201$36987f21226027a5d3f23a66bf781b2df155418b76c8c4a457492c68a0a8677c7c34b67faef7e3e9d821213f56e09340e457f9c2d1b827361958273619582736'; // Standard fallback or computed
    
    // We compute dynamic hash
    const dynamicHash = crypto.scryptSync('Admin@1234', 'apollo_salt_2026', 64).toString('hex');
    const finalAdminHash = `scrypt$apollo_salt_2026$${dynamicHash}`;

    const users = [
      { id: 'user-admin-main', name: 'Apollo Super Admin', email: 'admin@apollouniversity.edu.in', role: 'SUPER_ADMIN', passwordHash: finalAdminHash }
    ];

    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, name, email, password_hash, role, department_id, teacher_id, student_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash`,
        [u.id, u.name, u.email, u.passwordHash, u.role, null, null, null]
      );
    }

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
    const campus2 = 'camp-health';
    await client.query(
      `INSERT INTO campuses (id, university_id, name, code, location) VALUES 
       ($1, $2, 'Apollo Tech & Innovation Campus', 'APOLLO-TECH', 'North Academic Sector'),
       ($3, $2, 'Apollo Health Sciences Campus', 'APOLLO-HEALTH', 'Medical Research Park')
       ON CONFLICT (id) DO NOTHING`,
      [campus1, univId, campus2]
    );

    const facTech = 'fac-tech';
    const facHealth = 'fac-health';
    await client.query(
      `INSERT INTO faculties (id, campus_id, name, code, dean_name) VALUES 
       ($1, $2, 'School of Technology (SoT)', 'SOT', 'Dr. Margaret Hamilton'),
       ($3, $4, 'School of Health Sciences', 'SOHS', 'Dr. Prathap C. Reddy')
       ON CONFLICT (id) DO NOTHING`,
      [facTech, campus1, facHealth, campus2]
    );

    const deptCse = 'dept-cse';
    const deptAi = 'dept-ai';
    const deptEce = 'dept-ece';
    await client.query(
      `INSERT INTO departments (id, faculty_id, name, code, head_of_department) VALUES 
       ($1, $4, 'Computer Science & Engineering', 'CSE', 'Dr. Alan Turing'),
       ($2, $4, 'Artificial Intelligence & Data Science', 'AIDS', 'Dr. Geoffrey Hinton'),
       ($3, $4, 'Electronics & Communication Engineering', 'ECE', 'Dr. Claude Shannon')
       ON CONFLICT (id) DO NOTHING`,
      [deptCse, deptAi, deptEce, facTech]
    );

    const progCse = 'prog-btech-cse';
    const progAi = 'prog-btech-ai';
    await client.query(
      `INSERT INTO programs (id, department_id, name, code, degree, total_semesters) VALUES 
       ($1, $3, 'B.Tech in Computer Science & Engineering', 'BTECH-CSE', 'Bachelor of Technology', 8),
       ($2, $4, 'B.Tech in Artificial Intelligence & Machine Learning', 'BTECH-AIML', 'Bachelor of Technology', 8)
       ON CONFLICT (id) DO NOTHING`,
      [progCse, progAi, deptCse, deptAi]
    );

    const ayId = 'ay-2026-2027';
    await client.query(
      `INSERT INTO academic_years (id, university_id, name, start_date, end_date, is_current)
       VALUES ($1, $2, 'Academic Year 2026-2027', '2026-08-01', '2027-05-31', 1)
       ON CONFLICT (id) DO NOTHING`,
      [ayId, univId]
    );

    const sem3 = 'sem-cse-3';
    const sem5 = 'sem-cse-5';
    await client.query(
      `INSERT INTO semesters (id, academic_year_id, program_id, semester_number, name, is_odd) VALUES 
       ($1, $3, $4, 3, 'Semester III (Odd)', 1),
       ($2, $3, $4, 5, 'Semester V (Odd)', 1)
       ON CONFLICT (id) DO NOTHING`,
      [sem3, sem5, ayId, progCse]
    );

    const batch2025 = 'batch-cse-2025';
    const batch2024 = 'batch-cse-2024';
    await client.query(
      `INSERT INTO batches (id, program_id, academic_year_id, name, start_year, total_students) VALUES 
       ($1, $3, $4, 'Class of 2029 (2nd Year)', 2025, 120),
       ($2, $3, $4, 'Class of 2028 (3rd Year)', 2024, 120)
       ON CONFLICT (id) DO NOTHING`,
      [batch2025, batch2024, progCse, ayId]
    );

    const sec3A = 'sec-cse-3a';
    const sec3B = 'sec-cse-3b';
    const sec5A = 'sec-cse-5a';
    await client.query(
      `INSERT INTO sections (id, batch_id, semester_id, name, student_count) VALUES 
       ($1, $4, $5, 'B.Tech CSE 3-A', 60),
       ($2, $4, $5, 'B.Tech CSE 3-B', 60),
       ($3, $6, $7, 'B.Tech CSE 5-A', 60)
       ON CONFLICT (id) DO NOTHING`,
      [sec3A, sec3B, sec5A, batch2025, sem3, batch2024, sem5]
    );

    const grp3A1 = 'grp-3a-1';
    const grp3A2 = 'grp-3a-2';
    await client.query(
      `INSERT INTO student_groups (id, section_id, name, student_count) VALUES 
       ($1, $3, 'Group A1 (Lab Practical)', 30),
       ($2, $3, 'Group A2 (Lab Practical)', 30)
       ON CONFLICT (id) DO NOTHING`,
      [grp3A1, grp3A2, sec3A]
    );

    // 3. Teachers
    console.log('3. Inserting Faculty Members & Qualifications...');
    const teachersList = [
      { id: 't-1', empId: 'APOLLO-T01', name: 'Dr. Grace Hopper', email: 'dr.hopper@apollo.edu', deptId: deptCse, desig: 'Professor & Chair', maxDay: 4, maxWeek: 16, maxConsec: 2 },
      { id: 't-2', empId: 'APOLLO-T02', name: 'Dr. Barbara Liskov', email: 'dr.liskov@apollo.edu', deptId: deptCse, desig: 'Professor', maxDay: 4, maxWeek: 16, maxConsec: 2 },
      { id: 't-3', empId: 'APOLLO-T03', name: 'Dr. Donald Knuth', email: 'dr.knuth@apollo.edu', deptId: deptCse, desig: 'Distinguished Professor', maxDay: 3, maxWeek: 12, maxConsec: 2 },
      { id: 't-4', empId: 'APOLLO-T04', name: 'Dr. Alan Turing', email: 'dr.turing@apollo.edu', deptId: deptCse, desig: 'HOD & Professor', maxDay: 4, maxWeek: 14, maxConsec: 2 },
      { id: 't-5', empId: 'APOLLO-T05', name: 'Dr. Claude Shannon', email: 'dr.shannon@apollo.edu', deptId: deptEce, desig: 'Professor', maxDay: 4, maxWeek: 16, maxConsec: 3 },
      { id: 't-6', empId: 'APOLLO-T06', name: 'Dr. Geoffrey Hinton', email: 'dr.hinton@apollo.edu', deptId: deptAi, desig: 'AI Research Lead', maxDay: 4, maxWeek: 15, maxConsec: 2 },
      { id: 't-7', empId: 'APOLLO-T07', name: 'Prof. Ada Lovelace', email: 'coordinator@apollo.edu', deptId: deptCse, desig: 'Associate Professor & Coordinator', maxDay: 4, maxWeek: 14, maxConsec: 2 },
      { id: 't-8', empId: 'APOLLO-T08', name: 'Dr. Margaret Hamilton', email: 'dr.hamilton@apollo.edu', deptId: deptCse, desig: 'Dean & Distinguished Chair', maxDay: 3, maxWeek: 10, maxConsec: 2 }
    ];

    for (const t of teachersList) {
      await client.query(
        `INSERT INTO teachers (id, employee_id, name, email, department_id, designation, max_hours_per_day, max_hours_per_week, max_consecutive_hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [t.id, t.empId, t.name, t.email, t.deptId, t.desig, t.maxDay, t.maxWeek, t.maxConsec]
      );
    }

    // 4. Buildings, Rooms & Equipment
    console.log('4. Inserting Campus Infrastructure & Rooms...');
    const bldgTech = 'bldg-tech';
    const bldgRaman = 'bldg-raman';
    await client.query(
      `INSERT INTO buildings (id, campus_id, name, code, total_floors) VALUES 
       ($1, $3, 'Apollo School of Technology Block', 'APOLLO-TB', 4),
       ($2, $3, 'Sir C.V. Raman Science & Research Complex', 'APOLLO-RC', 3)
       ON CONFLICT (id) DO NOTHING`,
      [bldgTech, bldgRaman, campus1]
    );

    const roomsList = [
      { id: 'r-301', bldgId: bldgTech, name: 'Smart Classroom 301', code: 'TB-301', floor: 3, cap: 65, type: 'CLASSROOM' },
      { id: 'r-302', bldgId: bldgTech, name: 'Smart Classroom 302', code: 'TB-302', floor: 3, cap: 65, type: 'CLASSROOM' },
      { id: 'r-303', bldgId: bldgTech, name: 'Smart Classroom 303', code: 'TB-303', floor: 3, cap: 65, type: 'CLASSROOM' },
      { id: 'r-lh101', bldgId: bldgTech, name: 'Apollo Grand Lecture Hall 101', code: 'TB-LH101', floor: 1, cap: 130, type: 'LECTURE_HALL' },
      { id: 'r-lab1', bldgId: bldgTech, name: 'Advanced Algorithms Lab 1', code: 'TB-LAB1', floor: 2, cap: 35, type: 'LABORATORY' },
      { id: 'r-lab2', bldgId: bldgTech, name: 'AI & Machine Learning Lab 2', code: 'TB-LAB2', floor: 2, cap: 35, type: 'LABORATORY' },
      { id: 'r-sem', bldgId: bldgTech, name: 'Apollo Technology Seminar Hall', code: 'TB-SEM', floor: 4, cap: 80, type: 'SEMINAR_ROOM' }
    ];

    for (const r of roomsList) {
      await client.query(
        `INSERT INTO rooms (id, building_id, name, code, floor, capacity, room_type, is_accessible, department_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.bldgId, r.name, r.code, r.floor, r.cap, r.type, deptCse]
      );
    }

    // 5. Time Slots (Monday to Friday, 9:00 AM to 5:00 PM)
    console.log('5. Inserting Master Calendar Time Slots...');
    const days = [
      { idx: 0, name: 'Monday' },
      { idx: 1, name: 'Tuesday' },
      { idx: 2, name: 'Wednesday' },
      { idx: 3, name: 'Thursday' },
      { idx: 4, name: 'Friday' }
    ];

    const slots = [
      { period: 0, start: '09:00', end: '10:00', isBreak: 0, label: 'Period 1 (Morning Core)' },
      { period: 1, start: '10:00', end: '11:00', isBreak: 0, label: 'Period 2 (Morning Core)' },
      { period: 2, start: '11:15', end: '12:15', isBreak: 0, label: 'Period 3 (Mid-Morning)' },
      { period: 3, start: '12:15', end: '13:15', isBreak: 0, label: 'Period 4 (Pre-Lunch)' },
      { period: 4, start: '13:15', end: '14:15', isBreak: 1, label: 'Lunch & Wellbeing Break' },
      { period: 5, start: '14:15', end: '15:15', isBreak: 0, label: 'Period 5 (Afternoon Session)' },
      { period: 6, start: '15:15', end: '16:15', isBreak: 0, label: 'Period 6 (Practical / Elective)' },
      { period: 7, start: '16:15', end: '17:15', isBreak: 0, label: 'Period 7 (Tutorial / Lab)' }
    ];

    for (const d of days) {
      for (const s of slots) {
        const slotId = `slot-${d.idx}-${s.period}`;
        await client.query(
          `INSERT INTO time_slots (id, day_of_week, day_name, period_index, start_time, end_time, is_break, label)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING`,
          [slotId, d.idx, d.name, s.period, s.start, s.end, s.isBreak, s.label]
        );
      }
    }

    // 6. Courses
    console.log('6. Inserting Courses & Curriculum...');
    const coursesList = [
      { id: 'c-cs301', code: 'CS301', name: 'Data Structures & Algorithms', sem: 3, cred: 4, type: 'LECTURE', roomType: 'CLASSROOM' },
      { id: 'c-cs302', code: 'CS302', name: 'Operating Systems & System Architecture', sem: 3, cred: 4, type: 'LECTURE', roomType: 'CLASSROOM' },
      { id: 'c-cs303', code: 'CS303', name: 'Discrete Mathematical Structures', sem: 3, cred: 3, type: 'LECTURE', roomType: 'CLASSROOM' },
      { id: 'c-cs304', code: 'CS304', name: 'Database Management Systems', sem: 3, cred: 3, type: 'LECTURE', roomType: 'CLASSROOM' },
      { id: 'c-cs301l', code: 'CS301L', name: 'Data Structures Practical Laboratory', sem: 3, cred: 2, type: 'LABORATORY', roomType: 'LABORATORY' },
      { id: 'c-cs501', code: 'CS501', name: 'Advanced Artificial Intelligence & Neural Networks', sem: 5, cred: 4, type: 'LECTURE', roomType: 'CLASSROOM' },
      { id: 'c-cs502', code: 'CS502', name: 'Computer Networks & Distributed Systems', sem: 5, cred: 4, type: 'LECTURE', roomType: 'CLASSROOM' }
    ];

    for (const c of coursesList) {
      await client.query(
        `INSERT INTO courses (id, code, name, department_id, program_id, semester_number, credits, course_type, required_room_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.code, c.name, deptCse, progCse, c.sem, c.cred, c.type, c.roomType]
      );
    }

    // 7. Activities
    console.log('7. Inserting Academic Teaching Activities & Assignments...');
    const activitiesList = [
      { id: 'act-cs301-1', code: 'ACT-CS301-L1', name: 'CS301: Data Structures (Lecture 1)', courseId: 'c-cs301', dur: 1, type: 'LECTURE', roomType: 'CLASSROOM', teacherId: 't-1', secId: sec3A },
      { id: 'act-cs301-2', code: 'ACT-CS301-L2', name: 'CS301: Data Structures (Lecture 2)', courseId: 'c-cs301', dur: 1, type: 'LECTURE', roomType: 'CLASSROOM', teacherId: 't-1', secId: sec3A },
      { id: 'act-cs301-3', code: 'ACT-CS301-L3', name: 'CS301: Data Structures (Lecture 3)', courseId: 'c-cs301', dur: 1, type: 'LECTURE', roomType: 'CLASSROOM', teacherId: 't-1', secId: sec3A },
      { id: 'act-cs302-1', code: 'ACT-CS302-L1', name: 'CS302: Operating Systems (Lecture 1)', courseId: 'c-cs302', dur: 1, type: 'LECTURE', roomType: 'CLASSROOM', teacherId: 't-2', secId: sec3A },
      { id: 'act-cs302-2', code: 'ACT-CS302-L2', name: 'CS302: Operating Systems (Lecture 2)', courseId: 'c-cs302', dur: 1, type: 'LECTURE', roomType: 'CLASSROOM', teacherId: 't-2', secId: sec3A },
      { id: 'act-cs304-1', code: 'ACT-CS304-L1', name: 'CS304: Database Systems (Lecture 1)', courseId: 'c-cs304', dur: 1, type: 'LECTURE', roomType: 'CLASSROOM', teacherId: 't-3', secId: sec3A },
      { id: 'act-cs304-2', code: 'ACT-CS304-L2', name: 'CS304: Database Systems (Lecture 2)', courseId: 'c-cs304', dur: 1, type: 'LECTURE', roomType: 'CLASSROOM', teacherId: 't-3', secId: sec3A },
      { id: 'act-cs301l-a1', code: 'ACT-CS301L-P1', name: 'CS301L: Algorithms Lab (Group A1)', courseId: 'c-cs301l', dur: 2, type: 'LABORATORY', roomType: 'LABORATORY', teacherId: 't-1', grpId: grp3A1 },
      { id: 'act-cs301l-a2', code: 'ACT-CS301L-P2', name: 'CS301L: Algorithms Lab (Group A2)', courseId: 'c-cs301l', dur: 2, type: 'LABORATORY', roomType: 'LABORATORY', teacherId: 't-7', grpId: grp3A2 },
      { id: 'act-cs501-1', code: 'ACT-CS501-L1', name: 'CS501: Artificial Intelligence (Lecture 1)', courseId: 'c-cs501', dur: 1, type: 'LECTURE', roomType: 'CLASSROOM', teacherId: 't-6', secId: sec5A },
      { id: 'act-cs502-1', code: 'ACT-CS502-L1', name: 'CS502: Computer Networks (Lecture 1)', courseId: 'c-cs502', dur: 1, type: 'LECTURE', roomType: 'CLASSROOM', teacherId: 't-4', secId: sec5A }
    ];

    for (const a of activitiesList) {
      await client.query(
        `INSERT INTO activities (id, code, name, course_id, duration_periods, activity_type, required_room_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [a.id, a.code, a.name, a.courseId, a.dur, a.type, a.roomType]
      );

      await client.query(
        `INSERT INTO activity_teacher_assignments (id, activity_id, teacher_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [`at-${a.id}`, a.id, a.teacherId]
      );

      await client.query(
        `INSERT INTO activity_student_assignments (id, activity_id, section_id, group_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [`as-${a.id}`, a.id, a.secId || null, a.grpId || null]
      );
    }

    // 8. Smart Preference Profiles & Rules
    console.log('8. Inserting Smart Preference Profiles...');
    const profDefault = 'prof-apollo-balanced';
    await client.query(
      `INSERT INTO preference_profiles (id, name, profile_type, description, is_default)
       VALUES ($1, $2, $3, $4, 1)
       ON CONFLICT (id) DO NOTHING`,
      [profDefault, 'The Apollo Balanced Institutional Profile', 'BALANCED', 'Optimizes teacher rest periods, avoids student continuous fatigue, and preserves research blocks.']
    );

    const rules = [
      { id: 'rule-1', code: 'TEACHER_MAX_HOURS', name: 'Max Faculty Daily Teaching Limits', cat: 'TEACHER', pri: 'HARD', weight: 100 },
      { id: 'rule-2', code: 'STUDENT_NO_GAPS', name: 'Minimize Student Idle Window Gaps', cat: 'STUDENT', pri: 'HIGH', weight: 80 },
      { id: 'rule-3', code: 'LAB_AFTERNOON_PREF', name: 'Schedule Practical Labs in Double Blocks', cat: 'ROOM', pri: 'HIGH', weight: 85 },
      { id: 'rule-4', code: 'FACULTY_RESEARCH_WINDOW', name: 'Preserve Wednesday Afternoon for Faculty Research', cat: 'TEACHER', pri: 'MEDIUM', weight: 60 }
    ];

    for (const r of rules) {
      await client.query(
        `INSERT INTO smart_preference_rules (id, profile_id, category, rule_code, name, description, priority, weight, is_enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, profDefault, r.cat, r.code, r.name, r.name, r.pri, r.weight]
      );
    }

    // 9. Timetable & Schedule Entries
    console.log('9. Inserting Active Apollo Timetable & Schedule Grid...');
    const ttId = 'tt-active';
    const scoreObj = JSON.stringify({
      overall: 96.5,
      hardConstraintSatisfaction: 100,
      teacherPreferenceScore: 95.0,
      studentComfortScore: 94.8,
      roomUtilizationScore: 98.2,
      energyEfficiencyScore: 97.0
    });

    await client.query(
      `INSERT INTO timetables (id, academic_year_id, department_id, name, version, status, generation_mode, profile_id, quality_score_json, created_by)
       VALUES ($1, $2, $3, $4, 1, 'PUBLISHED', 'AUTOMATIC', $5, $6, 'Prof. Ada Lovelace')
       ON CONFLICT (id) DO UPDATE SET status = 'PUBLISHED', quality_score_json = $6`,
      [ttId, ayId, deptCse, 'Odd Semester 2026-2027 Master Routine', profDefault, scoreObj]
    );

    const entries = [
      { id: 'ent-1', actId: 'act-cs301-1', day: 0, period: 0, dur: 1, roomId: 'r-302', note: 'Morning theory lecture, optimal attention window' },
      { id: 'ent-2', actId: 'act-cs302-1', day: 0, period: 1, dur: 1, roomId: 'r-302', note: 'Continuous cohort room preservation' },
      { id: 'ent-3', actId: 'act-cs304-1', day: 0, period: 2, dur: 1, roomId: 'r-301', note: 'Smart screen room assigned' },
      { id: 'ent-4', actId: 'act-cs301l-a1', day: 1, period: 5, dur: 2, roomId: 'r-lab1', note: '2-hour practical lab block with Linux workstations' },
      { id: 'ent-5', actId: 'act-cs301l-a2', day: 1, period: 5, dur: 2, roomId: 'r-lab2', note: 'Parallel batch allocation in Lab 2' },
      { id: 'ent-6', actId: 'act-cs301-2', day: 2, period: 0, dur: 1, roomId: 'r-302', note: 'Mid-week review lecture' },
      { id: 'ent-7', actId: 'act-cs302-2', day: 2, period: 1, dur: 1, roomId: 'r-302', note: 'Operating Systems Kernel concepts' },
      { id: 'ent-8', actId: 'act-cs501-1', day: 3, period: 2, dur: 1, roomId: 'r-lh101', note: 'Grand Lecture Hall for AI session' },
      { id: 'ent-9', actId: 'act-cs502-1', day: 3, period: 3, dur: 1, roomId: 'r-lh101', note: 'Computer Networks cohort' },
      { id: 'ent-10', actId: 'act-cs301-3', day: 4, period: 0, dur: 1, roomId: 'r-302', note: 'Weekly recap and problem solving' },
      { id: 'ent-11', actId: 'act-cs304-2', day: 4, period: 1, dur: 1, roomId: 'r-301', note: 'SQL and transaction theory' }
    ];

    for (const e of entries) {
      await client.query(
        `INSERT INTO timetable_entries (id, timetable_id, activity_id, day_of_week, period_index, duration, room_id, is_locked, satisfaction_explanation)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8)
         ON CONFLICT (id) DO NOTHING`,
        [e.id, ttId, e.actId, e.day, e.period, e.dur, e.roomId, e.note]
      );
    }

    // 10. Audit Log Initial Entry
    console.log('10. Recording Initial System Audit Log...');
    await client.query(
      `INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, after_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [
        'log-init-01',
        'user-super',
        'Super Admin',
        'DATABASE_INITIALIZE',
        'SYSTEM',
        'neondb',
        'Clean PostgreSQL schema created & populated with The Apollo University master dataset.'
      ]
    );

    await client.query('COMMIT');
    console.log('====================================================');
    console.log('✓ Successfully seeded The Apollo University dataset into Neon PostgreSQL!');
    console.log('====================================================');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedPostgres(true).catch(() => process.exit(1));
}
