-- ===================================================
-- UNIVERSITY TIMETABLING SYSTEM - RELATIONAL SCHEMA
-- ===================================================

PRAGMA foreign_keys = ON;

-- 1. Users & RBAC
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'DEPARTMENT_ADMIN', 'TIMETABLE_COORDINATOR', 'FACULTY', 'STUDENT')),
    department_id TEXT,
    faculty_id TEXT,
    teacher_id TEXT,
    student_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Universities & Hierarchy
CREATE TABLE IF NOT EXISTS universities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    address TEXT
);

CREATE TABLE IF NOT EXISTS campuses (
    id TEXT PRIMARY KEY,
    university_id TEXT NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    location TEXT
);

CREATE TABLE IF NOT EXISTS faculties (
    id TEXT PRIMARY KEY,
    campus_id TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    dean_name TEXT
);

CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    faculty_id TEXT NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    head_of_department TEXT
);

CREATE TABLE IF NOT EXISTS programs (
    id TEXT PRIMARY KEY,
    department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    degree TEXT NOT NULL,
    total_semesters INTEGER NOT NULL DEFAULT 8
);

CREATE TABLE IF NOT EXISTS academic_years (
    id TEXT PRIMARY KEY,
    university_id TEXT NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_current INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS semesters (
    id TEXT PRIMARY KEY,
    academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    semester_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    is_odd INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_year INTEGER NOT NULL,
    total_students INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    student_count INTEGER NOT NULL DEFAULT 60
);

CREATE TABLE IF NOT EXISTS student_groups (
    id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    student_count INTEGER NOT NULL DEFAULT 30
);

CREATE TABLE IF NOT EXISTS student_subgroups (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    student_count INTEGER NOT NULL DEFAULT 15
);

-- 3. Teachers & Qualifications
CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    employee_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    designation TEXT NOT NULL,
    max_hours_per_day INTEGER NOT NULL DEFAULT 5,
    max_hours_per_week INTEGER NOT NULL DEFAULT 20,
    min_hours_per_day INTEGER NOT NULL DEFAULT 1,
    max_working_days_per_week INTEGER NOT NULL DEFAULT 5,
    min_working_days_per_week INTEGER NOT NULL DEFAULT 3,
    max_consecutive_hours INTEGER NOT NULL DEFAULT 3,
    min_rest_hours_between_days INTEGER DEFAULT 12,
    max_gaps_per_day INTEGER NOT NULL DEFAULT 2,
    max_gaps_per_week INTEGER NOT NULL DEFAULT 6,
    home_room_id TEXT,
    home_building_id TEXT
);

CREATE TABLE IF NOT EXISTS teacher_qualifications (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    roll_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    group_id TEXT REFERENCES student_groups(id) ON DELETE SET NULL,
    subgroup_id TEXT REFERENCES student_subgroups(id) ON DELETE SET NULL
);

-- 4. Infrastructure (Buildings, Rooms, Equipment)
CREATE TABLE IF NOT EXISTS buildings (
    id TEXT PRIMARY KEY,
    campus_id TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    total_floors INTEGER NOT NULL DEFAULT 3
);

CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    floor INTEGER NOT NULL DEFAULT 1,
    capacity INTEGER NOT NULL DEFAULT 60,
    room_type TEXT NOT NULL,
    is_accessible INTEGER NOT NULL DEFAULT 1,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS room_equipment (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    equipment_name TEXT NOT NULL
);

-- 5. Time Slots & Calendar System
CREATE TABLE IF NOT EXISTS time_slots (
    id TEXT PRIMARY KEY,
    day_of_week INTEGER NOT NULL, -- 0 = Monday ... 6 = Sunday
    day_name TEXT NOT NULL,
    period_index INTEGER NOT NULL, -- 0, 1, 2, ...
    start_time TEXT NOT NULL,      -- "09:00"
    end_time TEXT NOT NULL,        -- "10:00"
    is_break INTEGER NOT NULL DEFAULT 0,
    label TEXT
);

-- 6. Courses & Activities
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    semester_number INTEGER NOT NULL,
    credits INTEGER NOT NULL DEFAULT 3,
    course_type TEXT NOT NULL DEFAULT 'LECTURE',
    lecture_hours_per_week INTEGER NOT NULL DEFAULT 3,
    tutorial_hours_per_week INTEGER NOT NULL DEFAULT 0,
    practical_hours_per_week INTEGER NOT NULL DEFAULT 0,
    lab_hours_per_week INTEGER NOT NULL DEFAULT 0,
    required_room_type TEXT NOT NULL DEFAULT 'CLASSROOM'
);

CREATE TABLE IF NOT EXISTS course_required_equipment (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    equipment_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    duration_periods INTEGER NOT NULL DEFAULT 1,
    occurrences_per_week INTEGER NOT NULL DEFAULT 1,
    activity_type TEXT NOT NULL DEFAULT 'LECTURE',
    activity_tag TEXT,
    required_room_type TEXT NOT NULL DEFAULT 'CLASSROOM',
    preferred_room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
    preferred_building_id TEXT REFERENCES buildings(id) ON DELETE SET NULL,
    preferred_day_of_week INTEGER,
    preferred_period_index INTEGER,
    is_locked INTEGER NOT NULL DEFAULT 0,
    locked_day INTEGER,
    locked_period INTEGER,
    locked_room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
    split_from_activity_id TEXT
);

CREATE TABLE IF NOT EXISTS activity_teacher_assignments (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_student_assignments (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    section_id TEXT REFERENCES sections(id) ON DELETE CASCADE,
    group_id TEXT REFERENCES student_groups(id) ON DELETE CASCADE,
    subgroup_id TEXT REFERENCES student_subgroups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_required_equipment (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    equipment_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_relations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    activity_ids_json TEXT NOT NULL, -- JSON array of activity IDs
    min_gap_periods INTEGER,
    max_gap_periods INTEGER,
    is_hard_constraint INTEGER NOT NULL DEFAULT 1,
    weight INTEGER NOT NULL DEFAULT 100
);

-- 7. Availability Matrices
CREATE TABLE IF NOT EXISTS entity_availability (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('TEACHER', 'STUDENT_SECTION', 'STUDENT_GROUP', 'ROOM', 'ACTIVITY')),
    entity_id TEXT NOT NULL,
    day_of_week INTEGER NOT NULL,
    period_index INTEGER NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('UNAVAILABLE', 'DISCOURAGED', 'NEUTRAL', 'PREFERRED', 'STRONGLY_PREFERRED'))
);

-- 8. Smart Preferences & Presets
CREATE TABLE IF NOT EXISTS preference_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    profile_type TEXT NOT NULL,
    description TEXT NOT NULL,
    nl_prompt TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS smart_preference_rules (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES preference_profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('STUDENT', 'TEACHER', 'ROOM', 'UNIVERSITY')),
    rule_code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    target_scope TEXT NOT NULL DEFAULT 'GLOBAL',
    target_id TEXT,
    parameter_value_json TEXT,
    priority TEXT NOT NULL CHECK (priority IN ('HARD', 'VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW')),
    weight INTEGER NOT NULL DEFAULT 50,
    is_enabled INTEGER NOT NULL DEFAULT 1
);

-- 9. Timetables, Versions, Entries, Conflicts & Jobs
CREATE TABLE IF NOT EXISTS timetables (
    id TEXT PRIMARY KEY,
    academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    generation_mode TEXT NOT NULL DEFAULT 'AUTOMATIC',
    profile_id TEXT REFERENCES preference_profiles(id) ON DELETE SET NULL,
    quality_score_json TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME
);

CREATE TABLE IF NOT EXISTS timetable_entries (
    id TEXT PRIMARY KEY,
    timetable_id TEXT NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    period_index INTEGER NOT NULL,
    duration INTEGER NOT NULL DEFAULT 1,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    is_locked INTEGER NOT NULL DEFAULT 0,
    satisfaction_explanation TEXT,
    violated_soft_preferences_json TEXT
);

CREATE TABLE IF NOT EXISTS timetable_versions (
    id TEXT PRIMARY KEY,
    timetable_id TEXT NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    quality_score_json TEXT NOT NULL,
    total_entries INTEGER NOT NULL,
    conflicts_count INTEGER NOT NULL,
    entries_snapshot_json TEXT NOT NULL,
    change_summary TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conflicts (
    id TEXT PRIMARY KEY,
    timetable_id TEXT NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
    severity TEXT NOT NULL,
    conflict_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    affected_activity_ids_json TEXT,
    affected_teacher_ids_json TEXT,
    affected_student_group_ids_json TEXT,
    affected_room_ids_json TEXT,
    day_of_week INTEGER NOT NULL,
    period_index INTEGER NOT NULL,
    violated_constraint_rule TEXT NOT NULL,
    suggested_fix TEXT
);

CREATE TABLE IF NOT EXISTS generation_jobs (
    id TEXT PRIMARY KEY,
    timetable_id TEXT NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
    mode TEXT NOT NULL DEFAULT 'AUTOMATIC',
    status TEXT NOT NULL DEFAULT 'QUEUED',
    progress_percent INTEGER NOT NULL DEFAULT 0,
    current_stage TEXT NOT NULL DEFAULT 'Initialized',
    current_score REAL NOT NULL DEFAULT 0.0,
    best_score REAL NOT NULL DEFAULT 0.0,
    conflicts_count INTEGER NOT NULL DEFAULT 0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    error_message TEXT
);

-- 10. Audit Logs & System Settings
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    before_value TEXT,
    after_value TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for high-performance constraint matching
CREATE INDEX IF NOT EXISTS idx_activities_course ON activities(course_id);
CREATE INDEX IF NOT EXISTS idx_rooms_building ON rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_pos ON timetable_entries(timetable_id, day_of_week, period_index);
CREATE INDEX IF NOT EXISTS idx_availability_lookup ON entity_availability(entity_type, entity_id, day_of_week, period_index);
