import { db, initializeDatabase, runInTransaction } from './database';

export function seedDatabase(force: boolean = false): void {
  initializeDatabase();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0 && !force) {
    console.log('Database already contains data, skipping seed.');
    return;
  }

  console.log('Seeding database with realistic University demo dataset...');

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

    // 1. University
    const univId = 'univ-1';
    db.prepare('INSERT INTO universities (id, name, code, address) VALUES (?, ?, ?, ?)').run(
      univId,
      'Metropolitan Institute of Science & Technology',
      'MIST',
      'Innovation Boulevard, Academic Zone'
    );

    // 2. Campuses
    const campus1 = 'camp-main';
    const campus2 = 'camp-tech';
    db.prepare('INSERT INTO campuses (id, university_id, name, code, location) VALUES (?, ?, ?, ?, ?)').run(
      campus1, univId, 'Main Academic Campus', 'MIST-MAIN', 'North Enclave'
    );
    db.prepare('INSERT INTO campuses (id, university_id, name, code, location) VALUES (?, ?, ?, ?, ?)').run(
      campus2, univId, 'Tech & Innovation Campus', 'MIST-TECH', 'South Science Park'
    );

    // 3. Faculties
    const facEng = 'fac-eng';
    const facSci = 'fac-sci';
    db.prepare('INSERT INTO faculties (id, campus_id, name, code, dean_name) VALUES (?, ?, ?, ?, ?)').run(
      facEng, campus1, 'Faculty of Engineering & Technology', 'FET', 'Dr. Margaret Hamilton'
    );
    db.prepare('INSERT INTO faculties (id, campus_id, name, code, dean_name) VALUES (?, ?, ?, ?, ?)').run(
      facSci, campus2, 'Faculty of Applied Computing & Sciences', 'FACS', 'Dr. Donald Knuth'
    );

    // 4. Departments
    const deptCse = 'dept-cse';
    const deptEce = 'dept-ece';
    const deptIt = 'dept-it';
    db.prepare('INSERT INTO departments (id, faculty_id, name, code, head_of_department) VALUES (?, ?, ?, ?, ?)').run(
      deptCse, facEng, 'Computer Science & Engineering', 'CSE', 'Dr. Alan Turing'
    );
    db.prepare('INSERT INTO departments (id, faculty_id, name, code, head_of_department) VALUES (?, ?, ?, ?, ?)').run(
      deptEce, facEng, 'Electronics & Communication Engineering', 'ECE', 'Dr. Claude Shannon'
    );
    db.prepare('INSERT INTO departments (id, faculty_id, name, code, head_of_department) VALUES (?, ?, ?, ?, ?)').run(
      deptIt, facSci, 'Information Technology', 'IT', 'Dr. Grace Hopper'
    );

    // 5. Programs
    const progCse = 'prog-btech-cse';
    const progEce = 'prog-btech-ece';
    db.prepare('INSERT INTO programs (id, department_id, name, code, degree, total_semesters) VALUES (?, ?, ?, ?, ?, ?)').run(
      progCse, deptCse, 'B.Tech in Computer Science & Engineering', 'BTECH-CSE', 'B.Tech', 8
    );
    db.prepare('INSERT INTO programs (id, department_id, name, code, degree, total_semesters) VALUES (?, ?, ?, ?, ?, ?)').run(
      progEce, deptEce, 'B.Tech in Electronics & Communication', 'BTECH-ECE', 'B.Tech', 8
    );

    // 6. Academic Year & Semesters
    const ayCurrent = 'ay-2026-2027';
    db.prepare('INSERT INTO academic_years (id, university_id, name, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?, ?)').run(
      ayCurrent, univId, '2026–2027 (Odd Semester)', '2026-08-01', '2026-12-20', 1
    );

    const sem3Cse = 'sem-cse-3';
    const sem5Cse = 'sem-cse-5';
    const sem3Ece = 'sem-ece-3';
    db.prepare('INSERT INTO semesters (id, academic_year_id, program_id, semester_number, name, is_odd) VALUES (?, ?, ?, ?, ?, ?)').run(
      sem3Cse, ayCurrent, progCse, 3, 'Semester 3 (Sophomore CSE)', 1
    );
    db.prepare('INSERT INTO semesters (id, academic_year_id, program_id, semester_number, name, is_odd) VALUES (?, ?, ?, ?, ?, ?)').run(
      sem5Cse, ayCurrent, progCse, 5, 'Semester 5 (Junior CSE)', 1
    );
    db.prepare('INSERT INTO semesters (id, academic_year_id, program_id, semester_number, name, is_odd) VALUES (?, ?, ?, ?, ?, ?)').run(
      sem3Ece, ayCurrent, progEce, 3, 'Semester 3 (Sophomore ECE)', 1
    );

    // 7. Batches, Sections, Groups & Subgroups
    const batch2025 = 'batch-2025';
    const batch2024 = 'batch-2024';
    db.prepare('INSERT INTO batches (id, program_id, academic_year_id, name, start_year, total_students) VALUES (?, ?, ?, ?, ?, ?)').run(
      batch2025, progCse, ayCurrent, 'CSE Batch 2025–2029', 2025, 120
    );
    db.prepare('INSERT INTO batches (id, program_id, academic_year_id, name, start_year, total_students) VALUES (?, ?, ?, ?, ?, ?)').run(
      batch2024, progCse, ayCurrent, 'CSE Batch 2024–2028', 2024, 60
    );

    const secCseA = 'sec-cse-3a';
    const secCseB = 'sec-cse-3b';
    const secCse5A = 'sec-cse-5a';
    const secEceA = 'sec-ece-3a';
    db.prepare('INSERT INTO sections (id, batch_id, semester_id, name, student_count) VALUES (?, ?, ?, ?, ?)').run(
      secCseA, batch2025, sem3Cse, 'CSE 3-A', 60
    );
    db.prepare('INSERT INTO sections (id, batch_id, semester_id, name, student_count) VALUES (?, ?, ?, ?, ?)').run(
      secCseB, batch2025, sem3Cse, 'CSE 3-B', 60
    );
    db.prepare('INSERT INTO sections (id, batch_id, semester_id, name, student_count) VALUES (?, ?, ?, ?, ?)').run(
      secCse5A, batch2024, sem5Cse, 'CSE 5-A', 60
    );
    db.prepare('INSERT INTO sections (id, batch_id, semester_id, name, student_count) VALUES (?, ?, ?, ?, ?)').run(
      secEceA, batch2025, sem3Ece, 'ECE 3-A', 50
    );

    // Student Groups (e.g. Lab batches of 30 students)
    const grpA1 = 'grp-cse-3a1';
    const grpA2 = 'grp-cse-3a2';
    const grpB1 = 'grp-cse-3b1';
    const grpB2 = 'grp-cse-3b2';
    db.prepare('INSERT INTO student_groups (id, section_id, name, student_count) VALUES (?, ?, ?, ?)').run(
      grpA1, secCseA, 'CSE 3-A1', 30
    );
    db.prepare('INSERT INTO student_groups (id, section_id, name, student_count) VALUES (?, ?, ?, ?)').run(
      grpA2, secCseA, 'CSE 3-A2', 30
    );
    db.prepare('INSERT INTO student_groups (id, section_id, name, student_count) VALUES (?, ?, ?, ?)').run(
      grpB1, secCseB, 'CSE 3-B1', 30
    );
    db.prepare('INSERT INTO student_groups (id, section_id, name, student_count) VALUES (?, ?, ?, ?)').run(
      grpB2, secCseB, 'CSE 3-B2', 30
    );

    // 8. Buildings, Rooms & Equipment
    const bldTuring = 'bld-turing';
    const bldShannon = 'bld-shannon';
    const bldNewton = 'bld-newton';
    db.prepare('INSERT INTO buildings (id, campus_id, name, code, total_floors) VALUES (?, ?, ?, ?, ?)').run(
      bldTuring, campus1, 'Turing Computing Complex', 'BLD-TUR', 4
    );
    db.prepare('INSERT INTO buildings (id, campus_id, name, code, total_floors) VALUES (?, ?, ?, ?, ?)').run(
      bldShannon, campus1, 'Shannon Electronics Block', 'BLD-SHA', 3
    );
    db.prepare('INSERT INTO buildings (id, campus_id, name, code, total_floors) VALUES (?, ?, ?, ?, ?)').run(
      bldNewton, campus1, 'Newton Central Lecture Theatres', 'BLD-NEW', 2
    );

    // Equipment
    const eqList = ['Projector & AV', 'GPU Workstations', 'High-Speed Network Lab Kit', 'Microcontroller Boards', 'Smart Interactive Board'];
    const insertEq = db.prepare('INSERT INTO equipment (id, name, description) VALUES (?, ?, ?)');
    eqList.forEach((eq, idx) => {
      insertEq.run(`eq-${idx + 1}`, eq, `Standard university equipment: ${eq}`);
    });

    // Rooms
    const roomsData = [
      { id: 'room-lh101', bld: bldNewton, name: 'Grand Auditorium LH-101', code: 'LH-101', floor: 1, cap: 140, type: 'LECTURE_HALL' },
      { id: 'room-lh102', bld: bldNewton, name: 'Lecture Hall LH-102', code: 'LH-102', floor: 1, cap: 80, type: 'LECTURE_HALL' },
      { id: 'room-cr201', bld: bldTuring, name: 'Classroom CR-201', code: 'CR-201', floor: 2, cap: 65, type: 'CLASSROOM' },
      { id: 'room-cr202', bld: bldTuring, name: 'Classroom CR-202', code: 'CR-202', floor: 2, cap: 65, type: 'CLASSROOM' },
      { id: 'room-cr203', bld: bldTuring, name: 'Classroom CR-203', code: 'CR-203', floor: 2, cap: 65, type: 'CLASSROOM' },
      { id: 'room-cr301', bld: bldShannon, name: 'Classroom CR-301', code: 'CR-301', floor: 3, cap: 60, type: 'CLASSROOM' },
      { id: 'room-lab-ds', bld: bldTuring, name: 'Data Structures & Algorithms Lab', code: 'LAB-DS', floor: 1, cap: 35, type: 'COMPUTER_LAB' },
      { id: 'room-lab-db', bld: bldTuring, name: 'Database & Cloud Lab', code: 'LAB-DB', floor: 1, cap: 35, type: 'COMPUTER_LAB' },
      { id: 'room-lab-ai', bld: bldTuring, name: 'AI & GPU Research Lab', code: 'LAB-AI', floor: 3, cap: 35, type: 'COMPUTER_LAB' },
      { id: 'room-lab-ece', bld: bldShannon, name: 'Digital Electronics Lab', code: 'LAB-ECE', floor: 1, cap: 35, type: 'LABORATORY' },
      { id: 'room-sem-401', bld: bldTuring, name: 'Executive Seminar Room 401', code: 'SEM-401', floor: 4, cap: 45, type: 'SEMINAR_ROOM' }
    ];

    const insertRoom = db.prepare('INSERT INTO rooms (id, building_id, name, code, floor, capacity, room_type, is_accessible, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertRoomEq = db.prepare('INSERT INTO room_equipment (id, room_id, equipment_name) VALUES (?, ?, ?)');
    roomsData.forEach(r => {
      insertRoom.run(r.id, r.bld, r.name, r.code, r.floor, r.cap, r.type, 1, deptCse);
      insertRoomEq.run(`req-${r.id}-1`, r.id, 'Projector & AV');
      if (r.type === 'COMPUTER_LAB') {
        insertRoomEq.run(`req-${r.id}-2`, r.id, 'GPU Workstations');
      }
    });

    // 9. Time Slots (Monday - Friday, 6 standard periods per day + 1 lunch break)
    const days = [
      { dayOfWeek: 0, name: 'Monday' },
      { dayOfWeek: 1, name: 'Tuesday' },
      { dayOfWeek: 2, name: 'Wednesday' },
      { dayOfWeek: 3, name: 'Thursday' },
      { dayOfWeek: 4, name: 'Friday' }
    ];

    const periodTemplates = [
      { index: 0, start: '09:00', end: '10:00', isBreak: 0, label: 'Period 1 (Morning Core)' },
      { index: 1, start: '10:00', end: '11:00', isBreak: 0, label: 'Period 2' },
      { index: 2, start: '11:15', end: '12:15', isBreak: 0, label: 'Period 3' },
      { index: 3, start: '12:15', end: '13:15', isBreak: 0, label: 'Period 4' },
      { index: 4, start: '13:15', end: '14:00', isBreak: 1, label: 'Lunch Break' },
      { index: 5, start: '14:00', end: '15:00', isBreak: 0, label: 'Period 5 (Afternoon)' },
      { index: 6, start: '15:00', end: '16:00', isBreak: 0, label: 'Period 6' },
      { index: 7, start: '16:00', end: '17:00', isBreak: 0, label: 'Period 7 (Late Afternoon)' }
    ];

    const insertTimeSlot = db.prepare('INSERT INTO time_slots (id, day_of_week, day_name, period_index, start_time, end_time, is_break, label) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    days.forEach(d => {
      periodTemplates.forEach(p => {
        const slotId = `slot-${d.dayOfWeek}-${p.index}`;
        insertTimeSlot.run(slotId, d.dayOfWeek, d.name, p.index, p.start, p.end, p.isBreak, p.label);
      });
    });

    // 10. Teachers
    const teachersData = [
      { id: 'teach-turing', empId: 'FAC-001', name: 'Dr. Alan Turing', email: 'alan.turing@mist.edu', desig: 'Professor & HOD', dept: deptCse, maxHDay: 4, maxHWeek: 16, maxConsec: 2 },
      { id: 'teach-hopper', empId: 'FAC-002', name: 'Dr. Grace Hopper', email: 'grace.hopper@mist.edu', desig: 'Professor', dept: deptCse, maxHDay: 4, maxHWeek: 18, maxConsec: 3 },
      { id: 'teach-neumann', empId: 'FAC-003', name: 'Dr. John von Neumann', email: 'john.neumann@mist.edu', desig: 'Professor', dept: deptCse, maxHDay: 4, maxHWeek: 16, maxConsec: 2 },
      { id: 'teach-lovelace', empId: 'FAC-004', name: 'Prof. Ada Lovelace', email: 'ada.lovelace@mist.edu', desig: 'Associate Professor', dept: deptCse, maxHDay: 5, maxHWeek: 20, maxConsec: 3 },
      { id: 'teach-knuth', empId: 'FAC-005', name: 'Dr. Donald Knuth', email: 'donald.knuth@mist.edu', desig: 'Dean & Distinguished Prof', dept: deptCse, maxHDay: 3, maxHWeek: 12, maxConsec: 2 },
      { id: 'teach-shannon', empId: 'FAC-006', name: 'Dr. Claude Shannon', email: 'claude.shannon@mist.edu', desig: 'Professor & HOD', dept: deptEce, maxHDay: 4, maxHWeek: 16, maxConsec: 3 },
      { id: 'teach-ritchie', empId: 'FAC-007', name: 'Prof. Dennis Ritchie', email: 'dennis.ritchie@mist.edu', desig: 'Associate Professor', dept: deptCse, maxHDay: 5, maxHWeek: 20, maxConsec: 3 },
      { id: 'teach-thompson', empId: 'FAC-008', name: 'Prof. Ken Thompson', email: 'ken.thompson@mist.edu', desig: 'Assistant Professor', dept: deptCse, maxHDay: 5, maxHWeek: 20, maxConsec: 3 },
      { id: 'teach-dijkstra', empId: 'FAC-009', name: 'Dr. Edsger Dijkstra', email: 'edsger.dijkstra@mist.edu', desig: 'Professor', dept: deptCse, maxHDay: 4, maxHWeek: 16, maxConsec: 2 },
      { id: 'teach-lamport', empId: 'FAC-010', name: 'Dr. Leslie Lamport', email: 'leslie.lamport@mist.edu', desig: 'Associate Professor', dept: deptCse, maxHDay: 4, maxHWeek: 18, maxConsec: 3 },
      { id: 'teach-curie', empId: 'FAC-011', name: 'Dr. Marie Curie', email: 'marie.curie@mist.edu', desig: 'Associate Professor', dept: deptEce, maxHDay: 4, maxHWeek: 18, maxConsec: 3 }
    ];

    const insertTeacher = db.prepare('INSERT INTO teachers (id, employee_id, name, email, department_id, designation, max_hours_per_day, max_hours_per_week, min_hours_per_day, max_working_days_per_week, min_working_days_per_week, max_consecutive_hours, max_gaps_per_day, max_gaps_per_week) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    teachersData.forEach(t => {
      insertTeacher.run(t.id, t.empId, t.name, t.email, t.dept, t.desig, t.maxHDay, t.maxHWeek, 1, 5, 3, t.maxConsec, 2, 6);
    });

    // 11. Courses
    const coursesData = [
      { id: 'course-cs301', code: 'CS301', name: 'Data Structures & Algorithms', dept: deptCse, prog: progCse, sem: 3, cred: 4, type: 'LECTURE', reqRoom: 'CLASSROOM' },
      { id: 'course-cs302', code: 'CS302', name: 'Database Management Systems', dept: deptCse, prog: progCse, sem: 3, cred: 4, type: 'LECTURE', reqRoom: 'CLASSROOM' },
      { id: 'course-cs303', code: 'CS303', name: 'Computer Organization & Architecture', dept: deptCse, prog: progCse, sem: 3, cred: 3, type: 'LECTURE', reqRoom: 'CLASSROOM' },
      { id: 'course-cs304', code: 'CS304', name: 'Discrete Mathematics', dept: deptCse, prog: progCse, sem: 3, cred: 3, type: 'LECTURE', reqRoom: 'CLASSROOM' },
      { id: 'course-cs391', code: 'CS391', name: 'Data Structures Laboratory', dept: deptCse, prog: progCse, sem: 3, cred: 2, type: 'LABORATORY', reqRoom: 'COMPUTER_LAB' },
      { id: 'course-cs392', code: 'CS392', name: 'Database Systems Laboratory', dept: deptCse, prog: progCse, sem: 3, cred: 2, type: 'LABORATORY', reqRoom: 'COMPUTER_LAB' },
      { id: 'course-ec301', code: 'EC301', name: 'Digital Logic & Circuit Design', dept: deptEce, prog: progCse, sem: 3, cred: 3, type: 'LECTURE', reqRoom: 'CLASSROOM' },
      { id: 'course-cs501', code: 'CS501', name: 'Operating Systems & Concurrency', dept: deptCse, prog: progCse, sem: 5, cred: 4, type: 'LECTURE', reqRoom: 'CLASSROOM' },
      { id: 'course-cs502', code: 'CS502', name: 'Artificial Intelligence & ML', dept: deptCse, prog: progCse, sem: 5, cred: 4, type: 'LECTURE', reqRoom: 'CLASSROOM' },
      { id: 'course-cs591', code: 'CS591', name: 'AI & Machine Learning Laboratory', dept: deptCse, prog: progCse, sem: 5, cred: 2, type: 'LABORATORY', reqRoom: 'COMPUTER_LAB' }
    ];

    const insertCourse = db.prepare('INSERT INTO courses (id, code, name, department_id, program_id, semester_number, credits, course_type, lecture_hours_per_week, required_room_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    coursesData.forEach(c => {
      insertCourse.run(c.id, c.code, c.name, c.dept, c.prog, c.sem, c.cred, c.type, c.cred, c.reqRoom);
    });

    // Qualifications
    const insertQual = db.prepare('INSERT INTO teacher_qualifications (id, teacher_id, course_id) VALUES (?, ?, ?)');
    insertQual.run('q1', 'teach-knuth', 'course-cs301');
    insertQual.run('q2', 'teach-dijkstra', 'course-cs301');
    insertQual.run('q3', 'teach-hopper', 'course-cs302');
    insertQual.run('q4', 'teach-lovelace', 'course-cs302');
    insertQual.run('q5', 'teach-neumann', 'course-cs303');
    insertQual.run('q6', 'teach-turing', 'course-cs304');
    insertQual.run('q7', 'teach-knuth', 'course-cs304');
    insertQual.run('q8', 'teach-ritchie', 'course-cs391');
    insertQual.run('q9', 'teach-thompson', 'course-cs392');
    insertQual.run('q10', 'teach-shannon', 'course-ec301');
    insertQual.run('q11', 'teach-curie', 'course-ec301');
    insertQual.run('q12', 'teach-ritchie', 'course-cs501');
    insertQual.run('q13', 'teach-thompson', 'course-cs501');
    insertQual.run('q14', 'teach-turing', 'course-cs502');
    insertQual.run('q15', 'teach-lamport', 'course-cs502');
    insertQual.run('q16', 'teach-lamport', 'course-cs591');

    // 12. Activities (Scheduling units)
    const activitiesData = [
      // CS301 Data Structures (CSE 3-A)
      { id: 'act-cs301-3a-1', code: 'ACT-CS301-A1', name: 'Data Structures Lec 1 (CSE 3-A)', course: 'course-cs301', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-knuth', sec: secCseA },
      { id: 'act-cs301-3a-2', code: 'ACT-CS301-A2', name: 'Data Structures Lec 2 (CSE 3-A)', course: 'course-cs301', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-knuth', sec: secCseA },
      { id: 'act-cs301-3a-3', code: 'ACT-CS301-A3', name: 'Data Structures Lec 3 (CSE 3-A)', course: 'course-cs301', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-knuth', sec: secCseA },

      // CS301 Data Structures (CSE 3-B)
      { id: 'act-cs301-3b-1', code: 'ACT-CS301-B1', name: 'Data Structures Lec 1 (CSE 3-B)', course: 'course-cs301', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-dijkstra', sec: secCseB },
      { id: 'act-cs301-3b-2', code: 'ACT-CS301-B2', name: 'Data Structures Lec 2 (CSE 3-B)', course: 'course-cs301', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-dijkstra', sec: secCseB },
      { id: 'act-cs301-3b-3', code: 'ACT-CS301-B3', name: 'Data Structures Lec 3 (CSE 3-B)', course: 'course-cs301', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-dijkstra', sec: secCseB },

      // CS302 Database Management Systems (CSE 3-A)
      { id: 'act-cs302-3a-1', code: 'ACT-CS302-A1', name: 'DBMS Lec 1 (CSE 3-A)', course: 'course-cs302', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-hopper', sec: secCseA },
      { id: 'act-cs302-3a-2', code: 'ACT-CS302-A2', name: 'DBMS Lec 2 (CSE 3-A)', course: 'course-cs302', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-hopper', sec: secCseA },
      { id: 'act-cs302-3a-3', code: 'ACT-CS302-A3', name: 'DBMS Lec 3 (CSE 3-A)', course: 'course-cs302', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-hopper', sec: secCseA },

      // CS302 Database Management Systems (CSE 3-B)
      { id: 'act-cs302-3b-1', code: 'ACT-CS302-B1', name: 'DBMS Lec 1 (CSE 3-B)', course: 'course-cs302', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-lovelace', sec: secCseB },
      { id: 'act-cs302-3b-2', code: 'ACT-CS302-B2', name: 'DBMS Lec 2 (CSE 3-B)', course: 'course-cs302', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-lovelace', sec: secCseB },
      { id: 'act-cs302-3b-3', code: 'ACT-CS302-B3', name: 'DBMS Lec 3 (CSE 3-B)', course: 'course-cs302', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-lovelace', sec: secCseB },

      // CS303 Computer Org & Architecture (Combined Lecture for CSE 3-A and CSE 3-B in Auditorium)
      { id: 'act-cs303-comb-1', code: 'ACT-CS303-C1', name: 'Comp Org Combined Lec 1 (CSE 3-A + 3-B)', course: 'course-cs303', dur: 1, type: 'LECTURE', reqRoom: 'LECTURE_HALL', teacher: 'teach-neumann', sec: secCseA, sec2: secCseB },
      { id: 'act-cs303-comb-2', code: 'ACT-CS303-C2', name: 'Comp Org Combined Lec 2 (CSE 3-A + 3-B)', course: 'course-cs303', dur: 1, type: 'LECTURE', reqRoom: 'LECTURE_HALL', teacher: 'teach-neumann', sec: secCseA, sec2: secCseB },

      // CS304 Discrete Mathematics (CSE 3-A & CSE 3-B)
      { id: 'act-cs304-3a-1', code: 'ACT-CS304-A1', name: 'Discrete Math Lec 1 (CSE 3-A)', course: 'course-cs304', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-turing', sec: secCseA },
      { id: 'act-cs304-3a-2', code: 'ACT-CS304-A2', name: 'Discrete Math Lec 2 (CSE 3-A)', course: 'course-cs304', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-turing', sec: secCseA },
      { id: 'act-cs304-3b-1', code: 'ACT-CS304-B1', name: 'Discrete Math Lec 1 (CSE 3-B)', course: 'course-cs304', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-turing', sec: secCseB },
      { id: 'act-cs304-3b-2', code: 'ACT-CS304-B2', name: 'Discrete Math Lec 2 (CSE 3-B)', course: 'course-cs304', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-turing', sec: secCseB },

      // EC301 Digital Logic (CSE 3-A & CSE 3-B)
      { id: 'act-ec301-3a-1', code: 'ACT-EC301-A1', name: 'Digital Logic Lec 1 (CSE 3-A)', course: 'course-ec301', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-shannon', sec: secCseA },
      { id: 'act-ec301-3a-2', code: 'ACT-EC301-A2', name: 'Digital Logic Lec 2 (CSE 3-A)', course: 'course-ec301', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-shannon', sec: secCseA },
      { id: 'act-ec301-3b-1', code: 'ACT-EC301-B1', name: 'Digital Logic Lec 1 (CSE 3-B)', course: 'course-ec301', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-curie', sec: secCseB },
      { id: 'act-ec301-3b-2', code: 'ACT-EC301-B2', name: 'Digital Logic Lec 2 (CSE 3-B)', course: 'course-ec301', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-curie', sec: secCseB },

      // Practical Labs (2 Continuous Periods Duration)
      { id: 'act-cs391-a1', code: 'ACT-CS391-A1', name: 'DS Lab Practical (Group 3-A1)', course: 'course-cs391', dur: 2, type: 'LABORATORY', reqRoom: 'COMPUTER_LAB', teacher: 'teach-ritchie', grp: grpA1 },
      { id: 'act-cs391-a2', code: 'ACT-CS391-A2', name: 'DS Lab Practical (Group 3-A2)', course: 'course-cs391', dur: 2, type: 'LABORATORY', reqRoom: 'COMPUTER_LAB', teacher: 'teach-ritchie', grp: grpA2 },
      { id: 'act-cs391-b1', code: 'ACT-CS391-B1', name: 'DS Lab Practical (Group 3-B1)', course: 'course-cs391', dur: 2, type: 'LABORATORY', reqRoom: 'COMPUTER_LAB', teacher: 'teach-ritchie', grp: grpB1 },
      { id: 'act-cs391-b2', code: 'ACT-CS391-B2', name: 'DS Lab Practical (Group 3-B2)', course: 'course-cs391', dur: 2, type: 'LABORATORY', reqRoom: 'COMPUTER_LAB', teacher: 'teach-ritchie', grp: grpB2 },

      { id: 'act-cs392-a1', code: 'ACT-CS392-A1', name: 'DBMS Lab Practical (Group 3-A1)', course: 'course-cs392', dur: 2, type: 'LABORATORY', reqRoom: 'COMPUTER_LAB', teacher: 'teach-thompson', grp: grpA1 },
      { id: 'act-cs392-a2', code: 'ACT-CS392-A2', name: 'DBMS Lab Practical (Group 3-A2)', course: 'course-cs392', dur: 2, type: 'LABORATORY', reqRoom: 'COMPUTER_LAB', teacher: 'teach-thompson', grp: grpA2 },
      { id: 'act-cs392-b1', code: 'ACT-CS392-B1', name: 'DBMS Lab Practical (Group 3-B1)', course: 'course-cs392', dur: 2, type: 'LABORATORY', reqRoom: 'COMPUTER_LAB', teacher: 'teach-thompson', grp: grpB1 },
      { id: 'act-cs392-b2', code: 'ACT-CS392-B2', name: 'DBMS Lab Practical (Group 3-B2)', course: 'course-cs392', dur: 2, type: 'LABORATORY', reqRoom: 'COMPUTER_LAB', teacher: 'teach-thompson', grp: grpB2 },

      // Semester 5 Activities
      { id: 'act-cs501-5a-1', code: 'ACT-CS501-A1', name: 'OS Concurrency Lec 1 (CSE 5-A)', course: 'course-cs501', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-ritchie', sec: secCse5A },
      { id: 'act-cs501-5a-2', code: 'ACT-CS501-A2', name: 'OS Concurrency Lec 2 (CSE 5-A)', course: 'course-cs501', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-ritchie', sec: secCse5A },
      { id: 'act-cs502-5a-1', code: 'ACT-CS502-A1', name: 'AI & ML Lec 1 (CSE 5-A)', course: 'course-cs502', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-turing', sec: secCse5A },
      { id: 'act-cs502-5a-2', code: 'ACT-CS502-A2', name: 'AI & ML Lec 2 (CSE 5-A)', course: 'course-cs502', dur: 1, type: 'LECTURE', reqRoom: 'CLASSROOM', teacher: 'teach-lamport', sec: secCse5A },
      { id: 'act-cs591-5a-1', code: 'ACT-CS591-A1', name: 'AI Research Lab (CSE 5-A)', course: 'course-cs591', dur: 2, type: 'LABORATORY', reqRoom: 'COMPUTER_LAB', teacher: 'teach-lamport', sec: secCse5A }
    ];

    const insertAct = db.prepare('INSERT INTO activities (id, code, name, course_id, duration_periods, occurrences_per_week, activity_type, required_room_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const insertActTeach = db.prepare('INSERT INTO activity_teacher_assignments (id, activity_id, teacher_id) VALUES (?, ?, ?)');
    const insertActSec = db.prepare('INSERT INTO activity_student_assignments (id, activity_id, section_id, group_id) VALUES (?, ?, ?, ?)');

    activitiesData.forEach(a => {
      insertAct.run(a.id, a.code, a.name, a.course, a.dur, 1, a.type, a.reqRoom);
      insertActTeach.run(`at-${a.id}-${a.teacher}`, a.id, a.teacher);
      if (a.sec) {
        insertActSec.run(`as-${a.id}-sec`, a.id, a.sec, null);
      }
      if ((a as any).sec2) {
        insertActSec.run(`as-${a.id}-sec2`, a.id, (a as any).sec2, null);
      }
      if (a.grp) {
        insertActSec.run(`as-${a.id}-grp`, a.id, null, a.grp);
      }
    });

    // 13. Availability Exceptions (Hard constraints: Unavailable periods)
    const insertAvail = db.prepare('INSERT INTO entity_availability (id, entity_type, entity_id, day_of_week, period_index, state) VALUES (?, ?, ?, ?, ?, ?)');
    // Dr. Turing unavailable Monday Period 0 (HOD senate)
    insertAvail.run('av-tur-1', 'TEACHER', 'teach-turing', 0, 0, 'UNAVAILABLE');
    // Dr. Hopper unavailable Friday afternoon (Research council)
    insertAvail.run('av-hop-1', 'TEACHER', 'teach-hopper', 4, 5, 'UNAVAILABLE');
    insertAvail.run('av-hop-2', 'TEACHER', 'teach-hopper', 4, 6, 'UNAVAILABLE');
    insertAvail.run('av-hop-3', 'TEACHER', 'teach-hopper', 4, 7, 'UNAVAILABLE');
    // Dr. Knuth strongly prefers mornings
    insertAvail.run('av-knu-1', 'TEACHER', 'teach-knuth', 1, 0, 'STRONGLY_PREFERRED');
    insertAvail.run('av-knu-2', 'TEACHER', 'teach-knuth', 2, 0, 'STRONGLY_PREFERRED');
    insertAvail.run('av-knu-3', 'TEACHER', 'teach-knuth', 3, 0, 'STRONGLY_PREFERRED');
    // AI Lab maintenance Wednesday Period 0
    insertAvail.run('av-lab-1', 'ROOM', 'room-lab-ai', 2, 0, 'UNAVAILABLE');

    // 14. Activity Relations (e.g. Same starting time, different day)
    const insertRel = db.prepare('INSERT INTO activity_relations (id, name, relation_type, activity_ids_json, is_hard_constraint, weight) VALUES (?, ?, ?, ?, ?, ?)');
    // DS Lab A1 and A2 should occur on Different Days or Same Day parallel
    insertRel.run(
      'rel-1',
      'Data Structures Lectures Different Days',
      'DIFFERENT_DAY',
      JSON.stringify(['act-cs301-3a-1', 'act-cs301-3a-2', 'act-cs301-3a-3']),
      1,
      100
    );
    insertRel.run(
      'rel-2',
      'DBMS Lectures Different Days',
      'DIFFERENT_DAY',
      JSON.stringify(['act-cs302-3a-1', 'act-cs302-3a-2', 'act-cs302-3a-3']),
      1,
      100
    );

    // 15. Preference Profiles & Rules
    const insertProfile = db.prepare('INSERT INTO preference_profiles (id, name, profile_type, description, nl_prompt, is_default) VALUES (?, ?, ?, ?, ?, ?)');
    const insertRule = db.prepare('INSERT INTO smart_preference_rules (id, profile_id, category, rule_code, name, description, target_scope, priority, weight, is_enabled, parameter_value_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

    // Profile 1: Student Friendly
    const profStudent = 'prof-student-friendly';
    insertProfile.run(
      profStudent,
      'Student Friendly',
      'STUDENT_FRIENDLY',
      'Optimizes for minimal gaps between classes, compact daily schedule, and no late classes after 4 PM.',
      'I want a student-friendly timetable with minimal student gaps and no classes after 4 PM.',
      0
    );
    insertRule.run('rule-sf-1', profStudent, 'STUDENT', 'MINIMIZE_GAPS', 'Minimize Student Gaps', 'Keep classes contiguous for each section to avoid waiting idle', 'GLOBAL', 'VERY_HIGH', 90, 1, null);
    insertRule.run('rule-sf-2', profStudent, 'STUDENT', 'AVOID_LATE_CLASSES', 'Avoid Late Classes (After 4 PM)', 'Do not schedule student lectures after period 6', 'GLOBAL', 'HIGH', 80, 1, JSON.stringify({ maxPeriod: 6 }));
    insertRule.run('rule-sf-3', profStudent, 'STUDENT', 'PREFER_AFTERNOON_LABS', 'Prefer Afternoon Labs', 'Schedule 2-hour practical labs in afternoon slots (periods 5-6)', 'GLOBAL', 'HIGH', 75, 1, null);
    insertRule.run('rule-sf-4', profStudent, 'STUDENT', 'MAX_DAILY_HOURS', 'Limit Daily Student Hours', 'Max 5 class periods per day per section', 'GLOBAL', 'VERY_HIGH', 90, 1, JSON.stringify({ maxHours: 5 }));

    // Profile 2: Faculty Friendly
    const profFaculty = 'prof-faculty-friendly';
    insertProfile.run(
      profFaculty,
      'Faculty Friendly',
      'FACULTY_FRIENDLY',
      'Prioritizes faculty gap reduction, balanced weekly workload, and maximum 3 consecutive teaching periods.',
      'Make it comfortable for professors with balanced teaching hours and max 3 continuous lectures.',
      0
    );
    insertRule.run('rule-ff-1', profFaculty, 'TEACHER', 'MINIMIZE_GAPS', 'Minimize Teacher Gaps', 'Avoid isolated teaching periods with long gaps in between', 'GLOBAL', 'VERY_HIGH', 85, 1, null);
    insertRule.run('rule-ff-2', profFaculty, 'TEACHER', 'MAX_CONSECUTIVE', 'Max 3 Consecutive Teaching Hours', 'Ensure faculty have rest intervals between long sessions', 'GLOBAL', 'HIGH', 80, 1, JSON.stringify({ maxConsecutive: 3 }));
    insertRule.run('rule-ff-3', profFaculty, 'TEACHER', 'BALANCE_WORKLOAD', 'Balance Weekly Teaching Spread', 'Distribute teacher load evenly across working days', 'GLOBAL', 'HIGH', 75, 1, null);

    // Profile 3: Balanced (Default)
    const profBalanced = 'prof-balanced';
    insertProfile.run(
      profBalanced,
      'Balanced (Recommended)',
      'BALANCED',
      'Holistic optimization balancing student comfort, faculty workload, room utilization, and building transit time.',
      'Balanced timetable for students, teachers, and rooms with afternoon labs and no Friday late classes.',
      1
    );
    insertRule.run('rule-bal-1', profBalanced, 'STUDENT', 'MINIMIZE_GAPS', 'Minimize Student Gaps', 'Keep student cohort schedules compact', 'GLOBAL', 'VERY_HIGH', 85, 1, null);
    insertRule.run('rule-bal-2', profBalanced, 'TEACHER', 'MINIMIZE_GAPS', 'Minimize Teacher Gaps', 'Keep teacher schedules consolidated', 'GLOBAL', 'HIGH', 75, 1, null);
    insertRule.run('rule-bal-3', profBalanced, 'STUDENT', 'PREFER_AFTERNOON_LABS', 'Prefer Afternoon Practical Labs', 'Place labs in periods 5 and 6', 'GLOBAL', 'HIGH', 75, 1, null);
    insertRule.run('rule-bal-4', profBalanced, 'ROOM', 'MINIMIZE_BUILDING_CHANGES', 'Minimize Building Movement', 'Keep consecutive classes of the same section in the same building', 'GLOBAL', 'MEDIUM', 65, 1, null);
    insertRule.run('rule-bal-5', profBalanced, 'UNIVERSITY', 'MAX_ROOM_UTILIZATION', 'Maximize Room Utilization', 'Optimize seat occupancy efficiency', 'GLOBAL', 'MEDIUM', 60, 1, null);

    // Profile 4: Room Efficient
    const profRoom = 'prof-room-efficient';
    insertProfile.run(
      profRoom,
      'Room Efficient',
      'ROOM_EFFICIENT',
      'Focuses on maximizing room utilization, minimizing room hopping, and consolidating lab infrastructure.',
      'Maximize room efficiency and minimize room hopping.',
      0
    );
    insertRule.run('rule-re-1', profRoom, 'ROOM', 'MAX_ROOM_UTILIZATION', 'Maximize Room Utilization', 'Ensure high occupancy for all lecture halls and labs', 'GLOBAL', 'VERY_HIGH', 90, 1, null);
    insertRule.run('rule-re-2', profRoom, 'ROOM', 'MINIMIZE_ROOM_CHANGES', 'Minimize Room Hopping', 'Keep section in home classroom when possible', 'GLOBAL', 'HIGH', 80, 1, null);

    // 16. Users & RBAC
    const usersData = [
      { id: 'user-super', name: 'Super Admin', email: 'admin@mist.edu', role: 'SUPER_ADMIN' },
      { id: 'user-univ-admin', name: 'Dean Academic Affairs', email: 'dean@mist.edu', role: 'UNIVERSITY_ADMIN' },
      { id: 'user-dept-admin', name: 'Dr. Alan Turing (HOD CSE)', email: 'hod.cse@mist.edu', role: 'DEPARTMENT_ADMIN', deptId: deptCse, teacherId: 'teach-turing' },
      { id: 'user-coordinator', name: 'Prof. Ada Lovelace (Timetable Coordinator)', email: 'coordinator@mist.edu', role: 'TIMETABLE_COORDINATOR', deptId: deptCse, teacherId: 'teach-lovelace' },
      { id: 'user-faculty', name: 'Dr. Grace Hopper', email: 'grace@mist.edu', role: 'FACULTY', deptId: deptCse, teacherId: 'teach-hopper' },
      { id: 'user-student', name: 'Alex Johnson (Student CSE 3-A)', email: 'alex.j@student.mist.edu', role: 'STUDENT', deptId: deptCse }
    ];

    const insertUser = db.prepare('INSERT INTO users (id, name, email, role, department_id, teacher_id) VALUES (?, ?, ?, ?, ?, ?)');
    usersData.forEach(u => {
      insertUser.run(u.id, u.name, u.email, u.role, u.deptId || null, u.teacherId || null);
    });

    console.log('Database seeded successfully with Metropolitan Institute of Science & Technology demo data.');
  });
}
