const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'timetable.db');
const db = new Database(dbPath);

console.log('Cleaning database...');

const tablesToEmpty = [
  'timetable_entries',
  'conflicts',
  'generation_jobs',
  'timetable_versions',
  'timetables',
  'entity_availability',
  'activity_relations',
  'activity_required_equipment',
  'activity_student_assignments',
  'activity_teacher_assignments',
  'activities',
  'course_required_equipment',
  'teacher_qualifications',
  'courses',
  'students',
  'student_subgroups',
  'student_groups',
  'sections',
  'batches',
  'semesters',
  'programs',
  'departments',
  'faculties',
  'campuses',
  'room_equipment',
  'equipment',
  'rooms',
  'buildings',
  'time_slots',
  'academic_years',
  'audit_logs'
];

db.transaction(() => {
  for (const table of tablesToEmpty) {
    db.exec(`DELETE FROM ${table};`);
    console.log(`Cleared table: ${table}`);
  }
  
  // Also clear teachers, but we need to update users first to remove foreign key references to teachers
  db.exec(`UPDATE users SET teacher_id = NULL, department_id = NULL;`);
  db.exec(`DELETE FROM teachers;`);
  console.log('Cleared table: teachers');
})();

console.log('Database cleaned successfully! Users and Universities remain to prevent re-seeding.');
