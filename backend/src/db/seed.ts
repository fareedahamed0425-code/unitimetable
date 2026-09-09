import { db, initializeDatabase, runInTransaction } from './database';
import crypto from 'crypto';

export function seedDatabase(force: boolean = false): void {
  initializeDatabase();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0 && !force) {
    console.log('Database already contains data, skipping seed.');
    return;
  }

  console.log('Seeding clean database for The Apollo University...');

  runInTransaction(() => {
    // Clear existing data if force
    if (force) {
      db.exec(`
        DELETE FROM timetable_entries;
        DELETE FROM conflicts;
        DELETE FROM generation_jobs;
        DELETE FROM timetable_versions;
        DELETE FROM timetables;
        DELETE FROM smart_preference_rules;
        DELETE FROM preference_profiles;
        DELETE FROM entity_availability;
        DELETE FROM activity_relations;
        DELETE FROM activity_required_equipment;
        DELETE FROM activity_student_assignments;
        DELETE FROM activity_teacher_assignments;
        DELETE FROM activities;
        DELETE FROM course_required_equipment;
        DELETE FROM teacher_qualifications;
        DELETE FROM teachers;
        DELETE FROM courses;
        DELETE FROM students;
        DELETE FROM student_subgroups;
        DELETE FROM student_groups;
        DELETE FROM sections;
        DELETE FROM batches;
        DELETE FROM semesters;
        DELETE FROM programs;
        DELETE FROM departments;
        DELETE FROM faculties;
        DELETE FROM campuses;
        DELETE FROM room_equipment;
        DELETE FROM equipment;
        DELETE FROM rooms;
        DELETE FROM buildings;
        DELETE FROM time_slots;
        DELETE FROM academic_years;
        DELETE FROM universities;
        DELETE FROM users;
        DELETE FROM audit_logs;
      `);
    }

    // 0. Seed Official Super Administrator
    const dynamicHash = crypto.scryptSync('Admin@1234', 'apollo_salt_2026', 64).toString('hex');
    const finalAdminHash = `scrypt$apollo_salt_2026$${dynamicHash}`;
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run('user-admin-main', 'Apollo Super Admin', 'admin@apollouniversity.edu.in', finalAdminHash, 'SUPER_ADMIN');

    // 1. University
    const univId = 'univ-apollo';
    db.prepare('INSERT INTO universities (id, name, code, address) VALUES (?, ?, ?, ?)').run(
      univId,
      'The Apollo University',
      'APOLLO',
      'Apollo Knowledge City, Murukambattu, Chittoor - 517127, Andhra Pradesh, India'
    );

    // 2. Campus
    const campus1 = 'camp-main';
    db.prepare('INSERT INTO campuses (id, university_id, name, code, location) VALUES (?, ?, ?, ?, ?)').run(
      campus1, univId, 'Apollo Tech & Innovation Campus', 'APOLLO-TECH', 'Academic Complex'
    );

    // 3. Faculty / School
    const facTech = 'fac-sot';
    db.prepare('INSERT INTO faculties (id, campus_id, name, code, dean_name) VALUES (?, ?, ?, ?, ?)').run(
      facTech, campus1, 'School of Technology (SoT)', 'SOT', 'Dean of Engineering & Technology'
    );

    // 4. Requested Departments
    const deptCse = 'dept-cse';
    const deptAids = 'dept-aids';
    const deptAiml = 'dept-aiml';
    const deptCs = 'dept-cs';

    db.prepare('INSERT INTO departments (id, faculty_id, name, code, head_of_department) VALUES (?, ?, ?, ?, ?)').run(
      deptCse, facTech, 'Computer Science & Engineering', 'CSE', 'HOD Computer Science'
    );
    db.prepare('INSERT INTO departments (id, faculty_id, name, code, head_of_department) VALUES (?, ?, ?, ?, ?)').run(
      deptAids, facTech, 'Artificial Intelligence and Data Science', 'AIDS', 'HOD AI & Data Science'
    );
    db.prepare('INSERT INTO departments (id, faculty_id, name, code, head_of_department) VALUES (?, ?, ?, ?, ?)').run(
      deptAiml, facTech, 'Artificial Intelligence and Machine Learning', 'AIML', 'HOD AI & Machine Learning'
    );
    db.prepare('INSERT INTO departments (id, faculty_id, name, code, head_of_department) VALUES (?, ?, ?, ?, ?)').run(
      deptCs, facTech, 'Cyber Security', 'CS', 'HOD Cyber Security'
    );

    // 5. Programs
    const progCse = 'prog-btech-cse';
    const progAids = 'prog-btech-aids';
    const progAiml = 'prog-btech-aiml';
    const progCs = 'prog-btech-cs';

    db.prepare('INSERT INTO programs (id, department_id, name, code, degree, total_semesters) VALUES (?, ?, ?, ?, ?, ?)').run(
      progCse, deptCse, 'B.Tech in Computer Science & Engineering', 'BTECH-CSE', 'B.Tech', 8
    );
    db.prepare('INSERT INTO programs (id, department_id, name, code, degree, total_semesters) VALUES (?, ?, ?, ?, ?, ?)').run(
      progAids, deptAids, 'B.Tech in Artificial Intelligence and Data Science', 'BTECH-AIDS', 'B.Tech', 8
    );
    db.prepare('INSERT INTO programs (id, department_id, name, code, degree, total_semesters) VALUES (?, ?, ?, ?, ?, ?)').run(
      progAiml, deptAiml, 'B.Tech in Artificial Intelligence and Machine Learning', 'BTECH-AIML', 'B.Tech', 8
    );
    db.prepare('INSERT INTO programs (id, department_id, name, code, degree, total_semesters) VALUES (?, ?, ?, ?, ?, ?)').run(
      progCs, deptCs, 'B.Tech in Cyber Security', 'BTECH-CS', 'B.Tech', 8
    );

    // 6. Academic Year & Semesters
    const ayCurrent = 'ay-2026-2027';
    db.prepare('INSERT INTO academic_years (id, university_id, name, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?, ?)').run(
      ayCurrent, univId, 'Academic Year 2026–2027', '2026-08-01', '2026-12-20', 1
    );

    const semCse = 'sem-cse-3';
    const semAids = 'sem-aids-3';
    const semAiml = 'sem-aiml-3';
    const semCs = 'sem-cs-3';

    db.prepare('INSERT INTO semesters (id, academic_year_id, program_id, semester_number, name, is_odd) VALUES (?, ?, ?, ?, ?, ?)').run(
      semCse, ayCurrent, progCse, 3, 'Semester 3 (CSE)', 1
    );
    db.prepare('INSERT INTO semesters (id, academic_year_id, program_id, semester_number, name, is_odd) VALUES (?, ?, ?, ?, ?, ?)').run(
      semAids, ayCurrent, progAids, 3, 'Semester 3 (AI&DS)', 1
    );
    db.prepare('INSERT INTO semesters (id, academic_year_id, program_id, semester_number, name, is_odd) VALUES (?, ?, ?, ?, ?, ?)').run(
      semAiml, ayCurrent, progAiml, 3, 'Semester 3 (AI&ML)', 1
    );
    db.prepare('INSERT INTO semesters (id, academic_year_id, program_id, semester_number, name, is_odd) VALUES (?, ?, ?, ?, ?, ?)').run(
      semCs, ayCurrent, progCs, 3, 'Semester 3 (Cyber Security)', 1
    );

    // 7. Batches & Sections
    const batchCse = 'batch-cse-2025';
    const batchAids = 'batch-aids-2025';
    const batchAiml = 'batch-aiml-2025';
    const batchCs = 'batch-cs-2025';

    db.prepare('INSERT INTO batches (id, program_id, academic_year_id, name, start_year, total_students) VALUES (?, ?, ?, ?, ?, ?)').run(
      batchCse, progCse, ayCurrent, 'CSE 2025-2029', 2025, 180
    );
    db.prepare('INSERT INTO batches (id, program_id, academic_year_id, name, start_year, total_students) VALUES (?, ?, ?, ?, ?, ?)').run(
      batchAids, progAids, ayCurrent, 'AI&DS 2025-2029', 2025, 120
    );
    db.prepare('INSERT INTO batches (id, program_id, academic_year_id, name, start_year, total_students) VALUES (?, ?, ?, ?, ?, ?)').run(
      batchAiml, progAiml, ayCurrent, 'AI&ML 2025-2029', 2025, 120
    );
    db.prepare('INSERT INTO batches (id, program_id, academic_year_id, name, start_year, total_students) VALUES (?, ?, ?, ?, ?, ?)').run(
      batchCs, progCs, ayCurrent, 'Cyber Security 2025-2029', 2025, 120
    );

    // Requested Sections:
    // 1. Computer science engineering (sections: CSE-A, CSE-B, CSE-C)
    // 2. Artificial Intelligence and Data Science (sections: AIDS-A, AIDS-B)
    // 3. Artificial Intelligence and Machine learning (sections: AIML-A, AIML-B)
    // 4. Cyber Security (sections: CS-A, CS-B)
    const sectionsData = [
      { id: 'sec-cse-a', batch: batchCse, sem: semCse, name: 'CSE-A', count: 60 },
      { id: 'sec-cse-b', batch: batchCse, sem: semCse, name: 'CSE-B', count: 60 },
      { id: 'sec-cse-c', batch: batchCse, sem: semCse, name: 'CSE-C', count: 60 },
      { id: 'sec-aids-a', batch: batchAids, sem: semAids, name: 'AIDS-A', count: 60 },
      { id: 'sec-aids-b', batch: batchAids, sem: semAids, name: 'AIDS-B', count: 60 },
      { id: 'sec-aiml-a', batch: batchAiml, sem: semAiml, name: 'AIML-A', count: 60 },
      { id: 'sec-aiml-b', batch: batchAiml, sem: semAiml, name: 'AIML-B', count: 60 },
      { id: 'sec-cs-a', batch: batchCs, sem: semCs, name: 'CS-A', count: 60 },
      { id: 'sec-cs-b', batch: batchCs, sem: semCs, name: 'CS-B', count: 60 }
    ];

    const insertSec = db.prepare('INSERT INTO sections (id, batch_id, semester_id, name, student_count) VALUES (?, ?, ?, ?, ?)');
    sectionsData.forEach(s => {
      insertSec.run(s.id, s.batch, s.sem, s.name, s.count);
    });

    // 8. Buildings, Rooms & Equipment
    const bldMain = 'bld-apollo-tech';
    db.prepare('INSERT INTO buildings (id, campus_id, name, code, total_floors) VALUES (?, ?, ?, ?, ?)').run(
      bldMain, campus1, 'Apollo Technology Tower', 'APOLLO-TOW', 5
    );

    const roomsData = [
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

    const insertRoom = db.prepare('INSERT INTO rooms (id, building_id, name, code, floor, capacity, room_type, is_accessible, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    roomsData.forEach(r => {
      insertRoom.run(r.id, bldMain, r.name, r.code, r.floor, r.cap, r.type, 1, deptCse);
    });

    // 9. Time Slots (Monday - Saturday, 7 periods per day + 1 lunch break)
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

    const insertTimeSlot = db.prepare('INSERT INTO time_slots (id, day_of_week, day_name, period_index, start_time, end_time, is_break, label) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    days.forEach(d => {
      periodTemplates.forEach(p => {
        const slotId = `slot-${d.dayOfWeek}-${p.index}`;
        insertTimeSlot.run(slotId, d.dayOfWeek, d.name, p.index, p.start, p.end, p.isBreak, p.label);
      });
    });

    // 10. Initialize Clean Active Timetable Container
    const ttActiveId = 'tt-active';
    db.prepare(`
      INSERT INTO timetables (id, academic_year_id, name, version, status, generation_mode, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      ttActiveId,
      ayCurrent,
      'The Apollo University — Official Timetable',
      1,
      'PUBLISHED',
      'MANUAL',
      'admin-root'
    );

    console.log('✓ Successfully initialized clean database for The Apollo University with 4 departments and class sections.');
  });
}

if (require.main === module) {
  seedDatabase(true);
}
