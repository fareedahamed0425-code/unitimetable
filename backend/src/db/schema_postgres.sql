-- =====================================================
-- THE APOLLO UNIVERSITY — NEON POSTGRESQL SCHEMA
-- Safe / Idempotent: CREATE TABLE IF NOT EXISTS only
-- No DROP TABLE — runs safely on every server startup
-- =====================================================

-- 1. Users & RBAC
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) DEFAULT '',
    role VARCHAR(50) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'UNIVERSITY_ADMIN', 'DEPARTMENT_ADMIN', 'TIMETABLE_COORDINATOR', 'DEAN', 'HOD', 'FACULTY', 'STUDENT')),
    department_id VARCHAR(100),
    faculty_id VARCHAR(100),
    teacher_id VARCHAR(100),
    student_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Universities & Hierarchy
CREATE TABLE IF NOT EXISTS universities (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT
);

CREATE TABLE IF NOT EXISTS campuses (
    id VARCHAR(100) PRIMARY KEY,
    university_id VARCHAR(100) NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    location TEXT
);

CREATE TABLE IF NOT EXISTS faculties (
    id VARCHAR(100) PRIMARY KEY,
    campus_id VARCHAR(100) NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    dean_name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(100) PRIMARY KEY,
    faculty_id VARCHAR(100) NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    head_of_department VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS programs (
    id VARCHAR(100) PRIMARY KEY,
    department_id VARCHAR(100) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    degree VARCHAR(100) NOT NULL,
    total_semesters INTEGER NOT NULL DEFAULT 8
);

CREATE TABLE IF NOT EXISTS academic_years (
    id VARCHAR(100) PRIMARY KEY,
    university_id VARCHAR(100) NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_date VARCHAR(50) NOT NULL,
    end_date VARCHAR(50) NOT NULL,
    is_current INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS semesters (
    id VARCHAR(100) PRIMARY KEY,
    academic_year_id VARCHAR(100) NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    program_id VARCHAR(100) NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    semester_number INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_odd INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS batches (
    id VARCHAR(100) PRIMARY KEY,
    program_id VARCHAR(100) NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    academic_year_id VARCHAR(100) NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_year INTEGER NOT NULL,
    total_students INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sections (
    id VARCHAR(100) PRIMARY KEY,
    batch_id VARCHAR(100) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    semester_id VARCHAR(100) NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    student_count INTEGER NOT NULL DEFAULT 60,
    department_id VARCHAR(100),
    home_room_id VARCHAR(100),
    class_teacher_id VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS student_groups (
    id VARCHAR(100) PRIMARY KEY,
    section_id VARCHAR(100) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    student_count INTEGER NOT NULL DEFAULT 30
);

CREATE TABLE IF NOT EXISTS student_subgroups (
    id VARCHAR(100) PRIMARY KEY,
    group_id VARCHAR(100) NOT NULL REFERENCES student_groups(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    student_count INTEGER NOT NULL DEFAULT 15
);

-- 3. Teachers & Qualifications
CREATE TABLE IF NOT EXISTS teachers (
    id VARCHAR(100) PRIMARY KEY,
    employee_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    department_id VARCHAR(100) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    department_ids_json TEXT,
    designation VARCHAR(100) NOT NULL DEFAULT 'Assistant Professor',
    max_hours_per_day INTEGER NOT NULL DEFAULT 5,
    max_hours_per_week INTEGER NOT NULL DEFAULT 20,
    min_hours_per_day INTEGER NOT NULL DEFAULT 1,
    max_working_days_per_week INTEGER NOT NULL DEFAULT 5,
    min_working_days_per_week INTEGER NOT NULL DEFAULT 3,
    max_consecutive_hours INTEGER NOT NULL DEFAULT 3,
    min_rest_hours_between_days INTEGER DEFAULT 12,
    max_gaps_per_day INTEGER NOT NULL DEFAULT 2,
    max_gaps_per_week INTEGER NOT NULL DEFAULT 6,
    available_start_time VARCHAR(10) DEFAULT '09:00',
    available_end_time VARCHAR(10) DEFAULT '17:00',
    lunch_break_period INTEGER DEFAULT 4,
    unavailable_slots_json TEXT,
    home_room_id VARCHAR(100),
    home_building_id VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS teacher_qualifications (
    id VARCHAR(100) PRIMARY KEY,
    teacher_id VARCHAR(100) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    course_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(100) PRIMARY KEY,
    roll_number VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    batch_id VARCHAR(100) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    section_id VARCHAR(100) NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    group_id VARCHAR(100) REFERENCES student_groups(id) ON DELETE SET NULL,
    subgroup_id VARCHAR(100) REFERENCES student_subgroups(id) ON DELETE SET NULL
);

-- 4. Infrastructure
CREATE TABLE IF NOT EXISTS buildings (
    id VARCHAR(100) PRIMARY KEY,
    campus_id VARCHAR(100) NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    total_floors INTEGER NOT NULL DEFAULT 3
);

CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(100) PRIMARY KEY,
    building_id VARCHAR(100) NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    floor INTEGER NOT NULL DEFAULT 1,
    capacity INTEGER NOT NULL DEFAULT 60,
    room_type VARCHAR(50) NOT NULL DEFAULT 'CLASSROOM',
    is_accessible INTEGER NOT NULL DEFAULT 1,
    department_id VARCHAR(100) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS equipment (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS room_equipment (
    id VARCHAR(100) PRIMARY KEY,
    room_id VARCHAR(100) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    equipment_name VARCHAR(255) NOT NULL
);

-- 5. Time Slots
CREATE TABLE IF NOT EXISTS time_slots (
    id VARCHAR(100) PRIMARY KEY,
    day_of_week INTEGER NOT NULL,
    day_name VARCHAR(50) NOT NULL,
    period_index INTEGER NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    end_time VARCHAR(20) NOT NULL,
    is_break INTEGER NOT NULL DEFAULT 0,
    label VARCHAR(100),
    year_number INTEGER NOT NULL DEFAULT 0
);

-- 6. Courses & Activities
CREATE TABLE IF NOT EXISTS courses (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    department_id VARCHAR(100) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    program_id VARCHAR(100) NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    semester_number INTEGER NOT NULL,
    credits INTEGER NOT NULL DEFAULT 3,
    course_type VARCHAR(50) NOT NULL DEFAULT 'LECTURE',
    lecture_hours_per_week INTEGER NOT NULL DEFAULT 3,
    tutorial_hours_per_week INTEGER NOT NULL DEFAULT 0,
    practical_hours_per_week INTEGER NOT NULL DEFAULT 0,
    lab_hours_per_week INTEGER NOT NULL DEFAULT 0,
    required_room_type VARCHAR(50) NOT NULL DEFAULT 'CLASSROOM'
);

CREATE TABLE IF NOT EXISTS course_required_equipment (
    id VARCHAR(100) PRIMARY KEY,
    course_id VARCHAR(100) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    equipment_name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    course_id VARCHAR(100) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    duration_periods INTEGER NOT NULL DEFAULT 1,
    occurrences_per_week INTEGER NOT NULL DEFAULT 1,
    activity_type VARCHAR(50) NOT NULL DEFAULT 'LECTURE',
    activity_tag VARCHAR(100),
    required_room_type VARCHAR(50) NOT NULL DEFAULT 'CLASSROOM',
    preferred_room_id VARCHAR(100) REFERENCES rooms(id) ON DELETE SET NULL,
    preferred_building_id VARCHAR(100) REFERENCES buildings(id) ON DELETE SET NULL,
    preferred_day_of_week INTEGER,
    preferred_period_index INTEGER,
    is_locked INTEGER NOT NULL DEFAULT 0,
    locked_day INTEGER,
    locked_period INTEGER,
    locked_room_id VARCHAR(100) REFERENCES rooms(id) ON DELETE SET NULL,
    split_from_activity_id VARCHAR(100),
    total_student_count INTEGER DEFAULT 60
);

CREATE TABLE IF NOT EXISTS activity_teacher_assignments (
    id VARCHAR(100) PRIMARY KEY,
    activity_id VARCHAR(100) NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    teacher_id VARCHAR(100) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_student_assignments (
    id VARCHAR(100) PRIMARY KEY,
    activity_id VARCHAR(100) NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    section_id VARCHAR(100) REFERENCES sections(id) ON DELETE CASCADE,
    group_id VARCHAR(100) REFERENCES student_groups(id) ON DELETE CASCADE,
    subgroup_id VARCHAR(100) REFERENCES student_subgroups(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_required_equipment (
    id VARCHAR(100) PRIMARY KEY,
    activity_id VARCHAR(100) NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    equipment_name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_relations (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    relation_type VARCHAR(100) NOT NULL,
    activity_ids_json TEXT NOT NULL,
    min_gap_periods INTEGER,
    max_gap_periods INTEGER,
    is_hard_constraint INTEGER NOT NULL DEFAULT 1,
    weight INTEGER NOT NULL DEFAULT 100
);

-- 7. Availability
CREATE TABLE IF NOT EXISTS entity_availability (
    id VARCHAR(100) PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    day_of_week INTEGER NOT NULL,
    period_index INTEGER NOT NULL,
    state VARCHAR(50) NOT NULL
);

-- 8. Smart Preferences
CREATE TABLE IF NOT EXISTS preference_profiles (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    profile_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    nl_prompt TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS smart_preference_rules (
    id VARCHAR(100) PRIMARY KEY,
    profile_id VARCHAR(100) NOT NULL REFERENCES preference_profiles(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    rule_code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    target_scope VARCHAR(50) NOT NULL DEFAULT 'GLOBAL',
    target_id VARCHAR(100),
    parameter_value_json TEXT,
    priority VARCHAR(50) NOT NULL,
    weight INTEGER NOT NULL DEFAULT 50,
    is_enabled INTEGER NOT NULL DEFAULT 1
);

-- 9. Timetables
CREATE TABLE IF NOT EXISTS timetables (
    id VARCHAR(100) PRIMARY KEY,
    academic_year_id VARCHAR(100) NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    department_id VARCHAR(100) REFERENCES departments(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    generation_mode VARCHAR(50) NOT NULL DEFAULT 'AUTOMATIC',
    profile_id VARCHAR(100) REFERENCES preference_profiles(id) ON DELETE SET NULL,
    quality_score_json TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS timetable_entries (
    id VARCHAR(100) PRIMARY KEY,
    timetable_id VARCHAR(100) NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
    activity_id VARCHAR(100) NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    period_index INTEGER NOT NULL,
    duration INTEGER NOT NULL DEFAULT 1,
    room_id VARCHAR(100) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    is_locked INTEGER NOT NULL DEFAULT 0,
    satisfaction_explanation TEXT,
    violated_soft_preferences_json TEXT
);

CREATE TABLE IF NOT EXISTS timetable_versions (
    id VARCHAR(100) PRIMARY KEY,
    timetable_id VARCHAR(100) NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    quality_score_json TEXT NOT NULL,
    total_entries INTEGER NOT NULL,
    conflicts_count INTEGER NOT NULL,
    entries_snapshot_json TEXT NOT NULL,
    change_summary TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conflicts (
    id VARCHAR(100) PRIMARY KEY,
    timetable_id VARCHAR(100) NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
    severity VARCHAR(50) NOT NULL,
    conflict_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    affected_activity_ids_json TEXT,
    affected_teacher_ids_json TEXT,
    affected_student_group_ids_json TEXT,
    affected_room_ids_json TEXT,
    day_of_week INTEGER NOT NULL,
    period_index INTEGER NOT NULL,
    violated_constraint_rule VARCHAR(255) NOT NULL,
    suggested_fix TEXT
);

CREATE TABLE IF NOT EXISTS generation_jobs (
    id VARCHAR(100) PRIMARY KEY,
    timetable_id VARCHAR(100) NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
    mode VARCHAR(50) NOT NULL DEFAULT 'AUTOMATIC',
    status VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    progress_percent INTEGER NOT NULL DEFAULT 0,
    current_stage VARCHAR(255) NOT NULL DEFAULT 'Initialized',
    current_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    best_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    conflicts_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- 10. Audit & Files
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    before_value TEXT,
    after_value TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fet_import_history (
    id VARCHAR(100) PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    imported_by VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
    activities_count INTEGER NOT NULL DEFAULT 0,
    teachers_count INTEGER NOT NULL DEFAULT 0,
    rooms_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploaded_files (
    id VARCHAR(100) PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    content_text TEXT,
    uploaded_by VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activities_course ON activities(course_id);
CREATE INDEX IF NOT EXISTS idx_rooms_building ON rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_pos ON timetable_entries(timetable_id, day_of_week, period_index);
CREATE INDEX IF NOT EXISTS idx_availability_lookup ON entity_availability(entity_type, entity_id, day_of_week, period_index);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Ensure all columns exist on pre-existing tables
ALTER TABLE sections ADD COLUMN IF NOT EXISTS home_room_id VARCHAR(100);
ALTER TABLE sections ADD COLUMN IF NOT EXISTS class_teacher_id VARCHAR(100);
ALTER TABLE sections ADD COLUMN IF NOT EXISTS department_id VARCHAR(100);
ALTER TABLE sections ADD COLUMN IF NOT EXISTS student_count INTEGER DEFAULT 60;

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS department_ids_json TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS designation VARCHAR(150);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS max_hours_per_day INTEGER DEFAULT 5;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS available_start_time VARCHAR(10) DEFAULT '09:00';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS available_end_time VARCHAR(10) DEFAULT '17:00';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS lunch_break_period INTEGER DEFAULT 4;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS unavailable_slots_json TEXT;

ALTER TABLE activities ADD COLUMN IF NOT EXISTS total_student_count INTEGER DEFAULT 60;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS subject_code VARCHAR(50);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS subject_name VARCHAR(255);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS duration_periods INTEGER DEFAULT 1;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS occurrences_per_week INTEGER DEFAULT 3;

ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS year_number INTEGER DEFAULT 0;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS department_id VARCHAR(100);
