import { Request, Response, Router } from 'express';
import * as xlsx from 'xlsx';
import { db, runInTransaction, writeThroughPg, pgQuery, pgExecute, isPostgresConfigured } from '../db/database';
import { ConflictEngine } from '../engine/conflictEngine';
import { CSPSolver } from '../engine/cspSolver';
import { ExplainEngine } from '../engine/explainEngine';
import { FeasibilityAnalyzer } from '../engine/feasibilityAnalyzer';
import { TimetableOptimizer } from '../engine/optimizer';
import { QualityScorer } from '../engine/qualityScorer';
import { ActivityAssignment, TimetableProblemContext } from '../engine/types';
import { FETExporter } from '../fet/fetExporter';
import { FETParser } from '../fet/fetParser';
import { NLPPreferenceParser } from '../nlp/nlpPreferenceParser';
import { NLPTimetableEditor } from '../nlp/nlpTimetableEditor';
import { hashPassword, verifyPassword, generateAuthToken } from '../utils/auth';
import { seedDatabase } from '../db/seed';
import { seedPostgres } from '../db/seed_postgres';
import { dispatchTimetablesToFaculty } from '../email/emailDispatcher';

import {
  Activity,
  ActivityRelation,
  Building,
  Course,
  Department,
  EntityAvailability,
  GenerationJob,
  PreferenceProfile,
  Program,
  QualityScore,
  Room,
  Section,
  Semester,
  SmartPreferenceRule,
  StudentGroup,
  Teacher,
  TimeSlot,
  Timetable,
  TimetableConflict,
  TimetableEntry,
  TimetableVersion,
  RoleType,
  User
} from '../../../shared/types';

export const apiRouter = Router();

// In-memory generation jobs tracking
const activeJobs = new Map<string, GenerationJob>();

// ----------------------------------------------------
// Helper to build TimetableProblemContext from Database
// ----------------------------------------------------
function buildProblemContext(profileId?: string): TimetableProblemContext {
  const activitiesRaw = db.prepare('SELECT * FROM activities').all() as any[];
  const actTeachersRaw = db.prepare('SELECT * FROM activity_teacher_assignments').all() as any[];
  const actStudentsRaw = db.prepare('SELECT * FROM activity_student_assignments').all() as any[];

  const activities: Activity[] = activitiesRaw.map(a => {
    const teacherIds = actTeachersRaw.filter(at => at.activity_id === a.id).map(at => at.teacher_id);
    const sAss = actStudentsRaw.filter(as => as.activity_id === a.id);
    const sectionIds = sAss.filter(s => s.section_id).map(s => s.section_id);
    const groupIds = sAss.filter(s => s.group_id).map(s => s.group_id);
    const subgroupIds = sAss.filter(s => s.subgroup_id).map(s => s.subgroup_id);

    const totalStudentCount = a.total_student_count || 
      (groupIds.length > 0 || subgroupIds.length > 0 ? 30 : (a.activity_type === 'LABORATORY' ? 30 : (a.name?.includes('Combined') ? 120 : 60)));

    return {
      id: a.id,
      code: a.code,
      name: a.name,
      courseId: a.course_id,
      teacherIds,
      sectionIds,
      groupIds,
      subgroupIds,
      totalStudentCount,
      durationPeriods: a.duration_periods || 1,
      occurrencesPerWeek: a.occurrences_per_week || 1,
      activityType: a.activity_type,
      activityTag: a.activity_tag || undefined,
      requiredRoomType: a.required_room_type || 'CLASSROOM',
      preferredRoomId: a.preferred_room_id || undefined,
      preferredBuildingId: a.preferred_building_id || undefined,
      preferredDayOfWeek: a.preferred_day_of_week !== null ? a.preferred_day_of_week : undefined,
      preferredPeriodIndex: a.preferred_period_index !== null ? a.preferred_period_index : undefined,
      isLocked: Boolean(a.is_locked),
      lockedDay: a.locked_day !== null ? a.locked_day : undefined,
      lockedPeriod: a.locked_period !== null ? a.locked_period : undefined,
      lockedRoomId: a.locked_room_id || undefined,
      requiredEquipment: JSON.parse(a.required_equipment || '[]')
    };
  });

  const teachersRaw = db.prepare('SELECT * FROM teachers').all() as any[];
  const qualsRaw = db.prepare('SELECT * FROM teacher_qualifications').all() as any[];
  const teachers = new Map<string, Teacher>();
  teachersRaw.forEach(t => {
    const quals = qualsRaw.filter(q => q.teacher_id === t.id).map(q => q.course_id);
    teachers.set(t.id, {
      id: t.id,
      employeeId: t.employee_id,
      name: t.name,
      email: t.email,
      phone: t.phone || undefined,
      departmentId: t.department_id,
      designation: t.designation,
      maxHoursPerDay: t.max_hours_per_day,
      maxHoursPerWeek: t.max_hours_per_week,
      minHoursPerDay: t.min_hours_per_day,
      maxWorkingDaysPerWeek: t.max_working_days_per_week,
      minWorkingDaysPerWeek: t.min_working_days_per_week,
      maxConsecutiveHours: t.max_consecutive_hours,
      minRestHoursBetweenDays: t.min_rest_hours_between_days || 12,
      maxGapsPerDay: t.max_gaps_per_day,
      maxGapsPerWeek: t.max_gaps_per_week,
      homeRoomId: t.home_room_id || undefined,
      homeBuildingId: t.home_building_id || undefined,
      qualifications: quals
    });
  });

  const roomsRaw = db.prepare('SELECT * FROM rooms').all() as any[];
  const roomEqRaw = db.prepare('SELECT * FROM room_equipment').all() as any[];
  const rooms = new Map<string, Room>();
  roomsRaw.forEach(r => {
    const eq = roomEqRaw.filter(e => e.room_id === r.id).map(e => e.equipment_name);
    rooms.set(r.id, {
      id: r.id,
      buildingId: r.building_id,
      name: r.name,
      code: r.code,
      floor: r.floor,
      capacity: r.capacity,
      roomType: r.room_type,
      equipment: eq,
      isAccessible: Boolean(r.is_accessible),
      departmentId: r.department_id || undefined
    });
  });

  const allSlotsRaw = db.prepare('SELECT * FROM time_slots ORDER BY day_of_week ASC, period_index ASC').all() as any[];
  const allTimeSlots: TimeSlot[] = allSlotsRaw.map(s => ({
    id: s.id,
    dayOfWeek: s.day_of_week,
    dayName: s.day_name,
    periodIndex: s.period_index,
    startTime: s.start_time,
    endTime: s.end_time,
    isBreak: Boolean(s.is_break),
    label: s.label || undefined
  }));

  const timeSlots = allTimeSlots.filter(s => !s.isBreak);

  const availRaw = db.prepare('SELECT * FROM entity_availability').all() as any[];
  const availability: EntityAvailability[] = availRaw.map(a => ({
    entityType: a.entity_type,
    entityId: a.entity_id,
    dayOfWeek: a.day_of_week,
    periodIndex: a.period_index,
    state: a.state
  }));

  const relRaw = db.prepare('SELECT * FROM activity_relations').all() as any[];
  const relations: ActivityRelation[] = relRaw.map(r => ({
    id: r.id,
    name: r.name,
    relationType: r.relation_type,
    activityIds: JSON.parse(r.activity_ids_json || '[]'),
    minGapPeriods: r.min_gap_periods || undefined,
    maxGapPeriods: r.max_gap_periods || undefined,
    isHardConstraint: Boolean(r.is_hard_constraint),
    weight: r.weight
  }));

  // Fetch preference rules from selected profile or default
  let prefRulesRaw: any[] = [];
  if (profileId) {
    prefRulesRaw = db.prepare('SELECT * FROM smart_preference_rules WHERE profile_id = ?').all(profileId) as any[];
  } else {
    const defProf = db.prepare('SELECT id FROM preference_profiles WHERE is_default = 1').get() as { id: string } | undefined;
    if (defProf) {
      prefRulesRaw = db.prepare('SELECT * FROM smart_preference_rules WHERE profile_id = ?').all(defProf.id) as any[];
    }
  }

  const preferences: SmartPreferenceRule[] = prefRulesRaw.map(r => ({
    id: r.id,
    category: r.category,
    ruleCode: r.rule_code,
    name: r.name,
    description: r.description,
    targetScope: r.target_scope,
    targetId: r.target_id || undefined,
    parameterValue: r.parameter_value_json ? JSON.parse(r.parameter_value_json) : undefined,
    priority: r.priority,
    weight: r.weight,
    isEnabled: Boolean(r.is_enabled)
  }));

  const maxDays = new Set(timeSlots.map(s => s.dayOfWeek)).size || 6;
  const maxPeriodsPerDay = Math.max(...timeSlots.map(s => s.periodIndex), 0) + 1;

  return {
    activities,
    teachers,
    rooms,
    timeSlots,
    allTimeSlots,
    availability,
    relations,
    preferences,
    maxDays,
    maxPeriodsPerDay
  };
}

// ----------------------------------------------------
// 1. AUTH & USERS (RBAC & Neon Database Authentication)
// ----------------------------------------------------
apiRouter.get('/auth/users', async (req: Request, res: Response) => {
  try {
    const pgUsers = await pgQuery<any>('SELECT id, name, email, role, department_id, created_at FROM users ORDER BY name ASC');
    if (pgUsers && pgUsers.length > 0) {
      return res.json({ success: true, data: pgUsers });
    }
  } catch (err) {
    // fallback to sqlite
  }
  const users = db.prepare('SELECT id, name, email, role, department_id, faculty_id, teacher_id, student_id, created_at FROM users ORDER BY name ASC').all() as User[];
  res.json({ success: true, data: users });
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  let user: any = null;

  try {
    const pgUsers = await pgQuery<any>('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
    if (pgUsers && pgUsers.length > 0) {
      user = pgUsers[0];
    }
  } catch (err) {
    console.error('Postgres login query fallback:', err);
  }

  if (!user) {
    user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail) as any;
  }

  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  // Verify password using scrypt hashing
  const isMatch = verifyPassword(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  // Create session token
  const token = generateAuthToken(user.id);
  
  // Record login in audit log
  const logId = `log-${Date.now()}`;
  const logSql = 'INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, after_value) VALUES (?, ?, ?, ?, ?, ?, ?)';
  try {
    db.prepare(logSql).run(logId, user.id, user.name, 'USER_LOGIN', 'USER', user.id, `User logged in with role ${user.role}`);
    writeThroughPg(logSql, [logId, user.id, user.name, 'USER_LOGIN', 'USER', user.id, `User logged in with role ${user.role}`]);
  } catch (e) {
    // Non-fatal logging
  }

  const { password_hash, ...userProfile } = user;
  res.json({
    success: true,
    data: {
      user: userProfile,
      token,
      message: `Successfully authenticated as ${user.role}`
    }
  });
});

apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  const { name, email, password, confirmPassword, role = 'FACULTY', departmentId, teacherId, studentId } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
  }
  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({ success: false, error: 'Passwords do not match' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const pgExisting = await pgQuery<any>('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
    if (pgExisting && pgExisting.length > 0) {
      return res.status(409).json({ success: false, error: 'User with this email already exists' });
    }
  } catch (err) {
    // proceed
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
  if (existing) {
    return res.status(409).json({ success: false, error: 'User with this email already exists' });
  }

  const userId = `user-${Date.now()}`;
  const pHash = hashPassword(password);
  const cleanRole = (role || 'STUDENT').toUpperCase();

  const insertSql = 'INSERT INTO users (id, name, email, password_hash, role, department_id, teacher_id, student_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  const params = [userId, name.trim(), cleanEmail, pHash, cleanRole, departmentId || null, teacherId || null, studentId || null];

  db.prepare(insertSql).run(...params);
  writeThroughPg(insertSql, params);

  const token = generateAuthToken(userId);

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        role: cleanRole,
        departmentId
      },
      token,
      message: 'Account created successfully'
    }
  });
});

apiRouter.get('/users', async (req: Request, res: Response) => {
  try {
    let rawUsers: any[] = [];
    try {
      rawUsers = await pgQuery<any>(`
        SELECT u.id, u.name, u.email, u.role, u.department_id, u.teacher_id, u.student_id, u.created_at,
               d.name as department_name, d.code as department_code
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        ORDER BY u.name ASC
      `);
    } catch (e) {}

    if (!rawUsers || rawUsers.length === 0) {
      rawUsers = db.prepare(`
        SELECT u.id, u.name, u.email, u.role, u.department_id, u.teacher_id, u.student_id, u.created_at,
               d.name as department_name, d.code as department_code
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        ORDER BY u.name ASC
      `).all() as any[];
    }

    const users: User[] = rawUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      departmentId: u.department_id || undefined,
      departmentName: u.department_name || undefined,
      departmentCode: u.department_code || undefined,
      teacherId: u.teacher_id || undefined,
      studentId: u.student_id || undefined,
      createdAt: u.created_at || new Date().toISOString()
    }));

    return res.json({ success: true, data: users });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin updates user role
apiRouter.put('/users/:id/role', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!role) {
    return res.status(400).json({ success: false, error: 'Role is required' });
  }
  const cleanRole = role.toUpperCase();
  try {
    const updateSql = 'UPDATE users SET role = ? WHERE id = ?';
    db.prepare(updateSql).run(cleanRole, id);
    writeThroughPg(updateSql, [cleanRole, id]);

    // Audit log
    const logId = `log-${Date.now()}`;
    const logSql = 'INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, after_value) VALUES (?, ?, ?, ?, ?, ?, ?)';
    try {
      db.prepare(logSql).run(logId, 'admin', 'Super Administrator', 'UPDATE_ROLE', 'USER', id, `Role updated to ${cleanRole}`);
      writeThroughPg(logSql, [logId, 'admin', 'Super Administrator', 'UPDATE_ROLE', 'USER', id, `Role updated to ${cleanRole}`]);
    } catch {}

    return res.json({ success: true, message: `User role successfully updated to ${cleanRole}` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin updates user profile details
apiRouter.put('/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, role, departmentId, teacherId } = req.body;
  try {
    const cleanRole = role ? role.toUpperCase() : undefined;
    const cleanEmail = email ? email.trim().toLowerCase() : undefined;
    const cleanName = name ? name.trim() : undefined;

    const updateSql = 'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role), department_id = ?, teacher_id = ? WHERE id = ?';
    const params = [cleanName || null, cleanEmail || null, cleanRole || null, departmentId || null, teacherId || null, id];
    db.prepare(updateSql).run(...params);
    writeThroughPg(updateSql, params);

    return res.json({ success: true, message: 'User updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin creates new user directly with role
apiRouter.post('/users', async (req: Request, res: Response) => {
  const { name, email, password, role = 'FACULTY', departmentId, teacherId } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const userId = `user-${Date.now()}`;
  const pHash = hashPassword(password);
  const cleanRole = role.toUpperCase();

  try {
    const insertSql = 'INSERT INTO users (id, name, email, password_hash, role, department_id, teacher_id) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const params = [userId, name.trim(), cleanEmail, pHash, cleanRole, departmentId || null, teacherId || null];
    db.prepare(insertSql).run(...params);
    writeThroughPg(insertSql, params);

    return res.status(201).json({
      success: true,
      data: { id: userId, name: name.trim(), email: cleanEmail, role: cleanRole, departmentId },
      message: `User created successfully with role ${cleanRole}`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin deletes user
apiRouter.delete('/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deleteSql = 'DELETE FROM users WHERE id = ?';
    db.prepare(deleteSql).run(id);
    writeThroughPg(deleteSql, [id]);

    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin resets user password
apiRouter.post('/users/:id/reset-password', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
  }
  try {
    const pHash = hashPassword(newPassword);
    const updateSql = 'UPDATE users SET password_hash = ? WHERE id = ?';
    db.prepare(updateSql).run(pHash, id);
    writeThroughPg(updateSql, [pHash, id]);

    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/auth/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'No authorization header provided' });
  }

  try {
    const token = authHeader.replace('Bearer ', '').trim();
    let userId: string | null = null;

    if (token.startsWith('apu_')) {
      const parts = token.split('_');
      if (parts.length >= 2) {
        userId = parts[1];
      }
    } else {
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        userId = decoded.split(':')[0];
      } catch {}
    }

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Invalid token structure' });
    }

    let user: any = null;
    try {
      const pgUsers = await pgQuery<any>('SELECT id, name, email, role, department_id, faculty_id, teacher_id, student_id FROM users WHERE id = $1', [userId]);
      if (pgUsers && pgUsers.length > 0) {
        user = pgUsers[0];
      }
    } catch (e) {}

    if (!user) {
      user = db.prepare('SELECT id, name, email, role, department_id, faculty_id, teacher_id, student_id FROM users WHERE id = ?').get(userId);
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Session expired or user not found' });
    }
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(401).json({ success: false, error: 'Invalid token: ' + err.message });
  }
});

// ----------------------------------------------------
// 1.1 FILE UPLOAD & POSTGRESQL PERSISTENCE
// ----------------------------------------------------
apiRouter.post('/upload/file', async (req: Request, res: Response) => {
  const { fileName = 'dataset.txt', fileType = 'text/plain', content = '', uploadedBy = 'System User' } = req.body;
  
  if (!content) {
    return res.status(400).json({ success: false, error: 'File content is empty' });
  }

  const fileId = `file-${Date.now()}`;
  const fileSize = Buffer.byteLength(content, 'utf8');

  const insertSql = 'INSERT INTO uploaded_files (id, file_name, file_type, file_size, content_text, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)';
  const params = [fileId, fileName, fileType, fileSize, content, uploadedBy];

  db.prepare(insertSql).run(...params);
  writeThroughPg(insertSql, params);

  res.json({
    success: true,
    data: {
      id: fileId,
      fileName,
      fileType,
      fileSize,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      message: 'File successfully saved to Neon PostgreSQL database.'
    }
  });
});

// ----------------------------------------------------
// 2. ACADEMIC HIERARCHY
// ----------------------------------------------------
apiRouter.get('/hierarchy', (req: Request, res: Response) => {
  const university = db.prepare('SELECT * FROM universities LIMIT 1').get();
  const campuses = db.prepare('SELECT * FROM campuses').all();
  const faculties = db.prepare('SELECT * FROM faculties').all();
  const departments = db.prepare('SELECT * FROM departments').all();
  const programs = db.prepare('SELECT * FROM programs').all();
  const academicYears = db.prepare('SELECT * FROM academic_years').all();
  const semesters = db.prepare('SELECT * FROM semesters').all();
  const batches = db.prepare('SELECT * FROM batches').all();
  const sections = db.prepare('SELECT * FROM sections').all();
  const studentGroups = db.prepare('SELECT * FROM student_groups').all();

  res.json({
    success: true,
    data: {
      university,
      campuses,
      faculties,
      departments,
      programs,
      academicYears,
      semesters,
      batches,
      sections,
      studentGroups
    }
  });
});

// ----------------------------------------------------
// 3. TEACHERS & FACULTY (Cross-Department Support)
// ----------------------------------------------------
apiRouter.get('/teachers', (req: Request, res: Response) => {
  const teachers = db.prepare(`
    SELECT t.*, d.name as department_name, d.code as department_code 
    FROM teachers t 
    LEFT JOIN departments d ON t.department_id = d.id 
    ORDER BY t.name ASC
  `).all() as any[];
  const qualifications = db.prepare('SELECT * FROM teacher_qualifications').all() as any[];

  const fullTeachers: Teacher[] = teachers.map(t => ({
    id: t.id,
    employeeId: t.employee_id,
    name: t.name,
    email: t.email,
    phone: t.phone,
    departmentId: t.department_id,
    departmentName: t.department_name || 'Academic Faculty',
    departmentCode: t.department_code || 'GEN',
    designation: t.designation,
    maxHoursPerDay: t.max_hours_per_day,
    maxHoursPerWeek: t.max_hours_per_week,
    minHoursPerDay: t.min_hours_per_day,
    maxWorkingDaysPerWeek: t.max_working_days_per_week,
    minWorkingDaysPerWeek: t.min_working_days_per_week,
    maxConsecutiveHours: t.max_consecutive_hours,
    minRestHoursBetweenDays: t.min_rest_hours_between_days,
    maxGapsPerDay: t.max_gaps_per_day,
    maxGapsPerWeek: t.max_gaps_per_week,
    qualifications: qualifications.filter(q => q.teacher_id === t.id).map(q => q.course_id)
  }));

  res.json({ success: true, data: fullTeachers });
});

// ----------------------------------------------------
// 4. COURSES & ACTIVITIES
// ----------------------------------------------------
apiRouter.get('/courses', (req: Request, res: Response) => {
  const courses = db.prepare('SELECT * FROM courses ORDER BY code ASC').all() as Course[];
  res.json({ success: true, data: courses });
});

apiRouter.get('/activities', (req: Request, res: Response) => {
  const context = buildProblemContext();
  res.json({ success: true, data: context.activities });
});

// ----------------------------------------------------
// 5. INFRASTRUCTURE & TIME SLOTS
// ----------------------------------------------------
apiRouter.get('/infrastructure', (req: Request, res: Response) => {
  const buildings = db.prepare('SELECT * FROM buildings ORDER BY name ASC').all() as Building[];
  const roomsRaw = db.prepare('SELECT * FROM rooms ORDER BY name ASC').all() as any[];
  const roomEq = db.prepare('SELECT * FROM room_equipment').all() as any[];

  const rooms: Room[] = roomsRaw.map(r => ({
    id: r.id,
    buildingId: r.building_id,
    name: r.name,
    code: r.code,
    floor: r.floor,
    capacity: r.capacity,
    roomType: r.room_type,
    isAccessible: Boolean(r.is_accessible),
    departmentId: r.department_id,
    equipment: roomEq.filter(e => e.room_id === r.id).map(e => e.equipment_name)
  }));

  res.json({ success: true, data: { buildings, rooms } });
});

apiRouter.get('/calendar', (req: Request, res: Response) => {
  const timeSlotsRaw = db.prepare('SELECT * FROM time_slots ORDER BY day_of_week ASC, period_index ASC').all() as any[];
  const timeSlots: TimeSlot[] = timeSlotsRaw.map(s => ({
    id: s.id,
    dayOfWeek: s.day_of_week,
    dayName: s.day_name,
    periodIndex: s.period_index,
    startTime: s.start_time,
    endTime: s.end_time,
    isBreak: Boolean(s.is_break),
    label: s.label
  }));

  res.json({ success: true, data: timeSlots });
});

// ----------------------------------------------------
// 6. AVAILABILITY MATRIX
// ----------------------------------------------------
apiRouter.get('/availability', (req: Request, res: Response) => {
  const availability = db.prepare('SELECT * FROM entity_availability').all() as EntityAvailability[];
  res.json({ success: true, data: availability });
});

apiRouter.post('/availability/toggle', (req: Request, res: Response) => {
  const { entityType, entityId, dayOfWeek, periodIndex, state } = req.body;
  const id = `av-${entityType}-${entityId}-${dayOfWeek}-${periodIndex}`;

  if (state === 'NEUTRAL') {
    db.prepare('DELETE FROM entity_availability WHERE entity_type = ? AND entity_id = ? AND day_of_week = ? AND period_index = ?').run(
      entityType, entityId, dayOfWeek, periodIndex
    );
  } else {
    db.prepare(`
      INSERT INTO entity_availability (id, entity_type, entity_id, day_of_week, period_index, state)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET state = excluded.state
    `).run(id, entityType, entityId, dayOfWeek, periodIndex, state);
  }

  res.json({ success: true, message: 'Availability updated successfully' });
});

// ----------------------------------------------------
// 7. SMART PREFERENCES & NLP
// ----------------------------------------------------
apiRouter.get('/preferences/profiles', (req: Request, res: Response) => {
  const profiles = db.prepare('SELECT * FROM preference_profiles ORDER BY is_default DESC, name ASC').all() as any[];
  const rules = db.prepare('SELECT * FROM smart_preference_rules').all() as any[];

  const fullProfiles: PreferenceProfile[] = profiles.map(p => ({
    id: p.id,
    name: p.name,
    profileType: p.profile_type,
    description: p.description,
    nlPrompt: p.nl_prompt,
    isDefault: Boolean(p.is_default),
    rules: rules.filter(r => r.profile_id === p.id).map(r => ({
      id: r.id,
      category: r.category,
      ruleCode: r.rule_code,
      name: r.name,
      description: r.description,
      targetScope: r.target_scope,
      targetId: r.target_id,
      priority: r.priority,
      weight: r.weight,
      isEnabled: Boolean(r.is_enabled),
      parameterValue: r.parameter_value_json ? JSON.parse(r.parameter_value_json) : undefined
    }))
  }));

  res.json({ success: true, data: fullProfiles });
});

apiRouter.post('/preferences/nlp-parse', async (req: Request, res: Response) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  try {
    const parsed = await NLPPreferenceParser.parse(prompt);
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("NLP Parse Error:", error);
    res.status(500).json({ success: false, error: error.message || 'Failed to parse preferences' });
  }
});

// ----------------------------------------------------
// 8. GENERATION & FEASIBILITY ENGINE
// ----------------------------------------------------
apiRouter.post('/generator/check-feasibility', (req: Request, res: Response) => {
  const { profileId } = req.body;
  const context = buildProblemContext(profileId);
  const report = FeasibilityAnalyzer.analyze(context);
  res.json({ success: true, data: report });
});

apiRouter.post('/generator/generate', async (req: Request, res: Response) => {
  const { mode = 'AUTOMATIC', profileId, customRules } = req.body;
  const jobId = `job-${Date.now()}`;

  const context = buildProblemContext(profileId);

  // If custom rules provided via wizard NLP confirmation, override rules in context
  if (customRules && Array.isArray(customRules)) {
    context.preferences = customRules;
  }

  // Pre-check feasibility
  const feasibility = FeasibilityAnalyzer.analyze(context);
  if (!feasibility.isFeasible) {
    return res.status(400).json({
      success: false,
      error: 'Cannot generate timetable due to critical constraint bottlenecks.',
      feasibility
    });
  }

  const job: GenerationJob = {
    id: jobId,
    timetableId: 'tt-active',
    mode,
    status: 'RUNNING',
    progressPercent: 5,
    currentStage: 'Validating Hard Constraints and Initializing CSP Domains',
    currentScore: 0,
    bestScore: 0,
    conflictsCount: 0,
    startedAt: new Date().toISOString()
  };
  activeJobs.set(jobId, job);

  // Run generation asynchronously
  setTimeout(() => {
    try {
      job.progressPercent = 20;
      job.currentStage = 'Executing Constraint Satisfaction Solver with MRV & Degree Heuristics';

      const solver = new CSPSolver(context);
      const cspSolution = solver.solve((pct, msg) => {
        job.progressPercent = pct;
        job.currentStage = msg;
      });

      if (!cspSolution) {
        job.status = 'FAILED';
        job.progressPercent = 100;
        job.errorMessage = 'CSP Solver could not find a 100% hard-constraint-satisfying placement. Relax constraints or adjust availability.';
        return;
      }

      job.progressPercent = 85;
      job.currentStage = 'Optimizing Soft Constraints and Smart Preferences via Simulated Annealing';

      const optimizedSolution = TimetableOptimizer.optimize(
        cspSolution,
        context,
        (pct, msg, score) => {
          job.progressPercent = pct;
          job.currentStage = msg;
          job.currentScore = score;
          job.bestScore = score;
        }
      );

      // Score and explanations
      const qualityScore = QualityScorer.calculate(optimizedSolution, context);
      const conflicts = ConflictEngine.detectConflicts(optimizedSolution, context);

      // Save to database
      runInTransaction(() => {
        const ttId = 'tt-active';
        const ay = db.prepare('SELECT id FROM academic_years WHERE is_current = 1 LIMIT 1').get() as { id: string };

        // Save Timetable master
        db.prepare(`
          INSERT INTO timetables (id, academic_year_id, name, version, status, generation_mode, profile_id, quality_score_json, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            version = version + 1,
            status = 'GENERATED',
            generation_mode = excluded.generation_mode,
            quality_score_json = excluded.quality_score_json,
            updated_at = CURRENT_TIMESTAMP
        `).run(
          ttId,
          ay.id,
          'Metropolitan Academic Timetable (Fall 2026)',
          1,
          'GENERATED',
          mode,
          profileId || 'prof-balanced',
          JSON.stringify(qualityScore),
          'Timetable Coordinator'
        );

        // Delete old entries and conflicts
        db.prepare('DELETE FROM timetable_entries WHERE timetable_id = ?').run(ttId);
        db.prepare('DELETE FROM conflicts WHERE timetable_id = ?').run(ttId);

        // Insert new entries with explainability
        const insertEntry = db.prepare(`
          INSERT INTO timetable_entries (
            id, timetable_id, activity_id, day_of_week, period_index, duration, room_id, is_locked, satisfaction_explanation
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const ass of optimizedSolution) {
          const explanation = ExplainEngine.explainAssignment(ass, context);
          insertEntry.run(
            `ent-${ttId}-${ass.activityId}`,
            ttId,
            ass.activityId,
            ass.dayOfWeek,
            ass.periodIndex,
            ass.duration,
            ass.roomId,
            ass.isLocked ? 1 : 0,
            explanation
          );
        }

        // Insert conflicts if any
        const insertConf = db.prepare(`
          INSERT INTO conflicts (
            id, timetable_id, severity, conflict_type, title, description,
            affected_activity_ids_json, affected_teacher_ids_json, affected_student_group_ids_json,
            affected_room_ids_json, day_of_week, period_index, violated_constraint_rule, suggested_fix
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        conflicts.forEach(c => {
          insertConf.run(
            c.id,
            ttId,
            c.severity,
            c.conflictType,
            c.title,
            c.description,
            JSON.stringify(c.affectedActivityIds),
            JSON.stringify(c.affectedTeacherIds),
            JSON.stringify(c.affectedStudentGroupIds),
            JSON.stringify(c.affectedRoomIds),
            c.dayOfWeek,
            c.periodIndex,
            c.violatedConstraintRule,
            c.suggestedFix || null
          );
        });

        // Save Version Snapshot
        db.prepare(`
          INSERT INTO timetable_versions (
            id, timetable_id, version_number, name, status, quality_score_json,
            total_entries, conflicts_count, entries_snapshot_json, change_summary, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `ver-${Date.now()}`,
          ttId,
          1,
          `Automated Generation (${mode})`,
          'GENERATED',
          JSON.stringify(qualityScore),
          optimizedSolution.length,
          conflicts.length,
          JSON.stringify(optimizedSolution),
          `Generated with quality score ${qualityScore.overallScore}% (Hard Constraints: ${qualityScore.hardConstraintSatisfaction}%)`,
          'Timetable Coordinator'
        );
      });

      job.status = 'COMPLETED';
      job.progressPercent = 100;
      job.currentStage = 'Timetable successfully generated and validated with 100% hard constraints satisfied.';
      job.currentScore = qualityScore.overallScore;
      job.bestScore = qualityScore.overallScore;
      job.conflictsCount = conflicts.length;
      job.completedAt = new Date().toISOString();
    } catch (err: any) {
      console.error('Generation Job Error:', err);
      job.status = 'FAILED';
      job.progressPercent = 100;
      job.errorMessage = err.message || 'Unexpected scheduling error';
    }
  }, 100);

  res.json({ success: true, data: { jobId, job } });
});

apiRouter.get('/generator/jobs/:jobId', (req: Request, res: Response) => {
  const job = activeJobs.get(req.params.jobId as string);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }
  res.json({ success: true, data: job });
});

// ----------------------------------------------------
// 9. TIMETABLE EXPLORER & LIVE MOVES
// ----------------------------------------------------
apiRouter.get('/timetables/active', (req: Request, res: Response) => {
  const tt = db.prepare('SELECT * FROM timetables WHERE id = ?').get('tt-active') as any;
  if (!tt) {
    return res.json({ success: true, data: null });
  }

  const entriesRaw = db.prepare('SELECT * FROM timetable_entries WHERE timetable_id = ?').all(tt.id) as any[];
  const context = buildProblemContext();
  const actMap = new Map(context.activities.map(a => [a.id, a]));
  const courses = db.prepare('SELECT * FROM courses').all() as Course[];
  const courseMap = new Map(courses.map(c => [c.id, c]));
  const buildings = db.prepare('SELECT * FROM buildings').all() as Building[];
  const bldMap = new Map(buildings.map(b => [b.id, b]));

  const entries: TimetableEntry[] = entriesRaw.map(e => {
    const act = actMap.get(e.activity_id);
    const crs = act ? courseMap.get(act.courseId) : undefined;
    const rm = context.rooms.get(e.room_id);
    const bld = rm ? bldMap.get(rm.buildingId) : undefined;
    const teachers = act ? act.teacherIds.map(tId => context.teachers.get(tId)?.name || tId) : [];

    const isCombined = Boolean(
      (act && act.sectionIds.length > 1) || 
      (act && act.teacherIds.length > 1) || 
      (act && act.name?.toLowerCase().includes('combined'))
    );

    return {
      id: e.id,
      timetableId: e.timetable_id,
      activityId: e.activity_id,
      activityName: act?.name || 'Academic Class',
      courseCode: crs?.code || 'CRS',
      courseName: crs?.name || 'Subject',
      activityType: act?.activityType || 'LECTURE',
      teacherIds: act?.teacherIds || [],
      teacherNames: teachers,
      sectionNames: act?.sectionIds || [],
      groupNames: act?.groupIds || [],
      subgroupNames: act?.subgroupIds || [],
      dayOfWeek: e.day_of_week,
      periodIndex: e.period_index,
      duration: e.duration,
      roomId: e.room_id,
      roomName: rm?.name || e.room_id,
      buildingName: bld?.name || 'Building',
      isLocked: Boolean(e.is_locked),
      isCombined,
      combinedSectionNames: act?.sectionIds || [],
      satisfactionExplanation: e.satisfaction_explanation
    };
  });

  const conflictsRaw = db.prepare('SELECT * FROM conflicts WHERE timetable_id = ?').all(tt.id) as any[];
  const conflicts: TimetableConflict[] = conflictsRaw.map(c => ({
    id: c.id,
    severity: c.severity,
    conflictType: c.conflict_type,
    title: c.title,
    description: c.description,
    affectedActivityIds: JSON.parse(c.affected_activity_ids_json || '[]'),
    affectedTeacherIds: JSON.parse(c.affected_teacher_ids_json || '[]'),
    affectedStudentGroupIds: JSON.parse(c.affected_student_group_ids_json || '[]'),
    affectedRoomIds: JSON.parse(c.affected_room_ids_json || '[]'),
    dayOfWeek: c.day_of_week,
    periodIndex: c.period_index,
    violatedConstraintRule: c.violated_constraint_rule,
    suggestedFix: c.suggested_fix
  }));

  const qualityScore: QualityScore = tt.quality_score_json ? JSON.parse(tt.quality_score_json) : QualityScorer.calculate(entriesRaw.map(e => ({
    activityId: e.activity_id,
    dayOfWeek: e.day_of_week,
    periodIndex: e.period_index,
    duration: e.duration,
    roomId: e.room_id,
    isLocked: Boolean(e.is_locked)
  })), context);

  res.json({
    success: true,
    data: {
      id: tt.id,
      name: tt.name,
      version: tt.version,
      status: tt.status,
      generationMode: tt.generation_mode,
      qualityScore,
      entries,
      conflicts,
      createdBy: tt.created_by,
      createdAt: tt.created_at,
      updatedAt: tt.updated_at,
      publishedAt: tt.published_at
    }
  });
});

// Live move / drag & drop endpoint
apiRouter.post('/timetables/move-entry', (req: Request, res: Response) => {
  const { entryId, dayOfWeek, periodIndex, roomId } = req.body;

  const entry = db.prepare('SELECT * FROM timetable_entries WHERE id = ?').get(entryId) as any;
  if (!entry) {
    return res.status(404).json({ success: false, error: 'Timetable entry not found' });
  }

  // Update entry position
  db.prepare(`
    UPDATE timetable_entries
    SET day_of_week = ?, period_index = ?, room_id = COALESCE(?, room_id)
    WHERE id = ?
  `).run(dayOfWeek, periodIndex, roomId || null, entryId);

  // Recalculate conflicts and quality score
  const context = buildProblemContext();
  const allEntriesRaw = db.prepare('SELECT * FROM timetable_entries WHERE timetable_id = ?').all(entry.timetable_id) as any[];
  const assignments: ActivityAssignment[] = allEntriesRaw.map(e => ({
    activityId: e.activity_id,
    dayOfWeek: e.day_of_week,
    periodIndex: e.period_index,
    duration: e.duration,
    roomId: e.room_id,
    isLocked: Boolean(e.is_locked)
  }));

  const conflicts = ConflictEngine.detectConflicts(assignments, context);
  const qualityScore = QualityScorer.calculate(assignments, context);

  // Save new score and conflicts
  runInTransaction(() => {
    db.prepare('UPDATE timetables SET quality_score_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      JSON.stringify(qualityScore), entry.timetable_id
    );

    db.prepare('DELETE FROM conflicts WHERE timetable_id = ?').run(entry.timetable_id);
    const insertConf = db.prepare(`
      INSERT INTO conflicts (
        id, timetable_id, severity, conflict_type, title, description,
        affected_activity_ids_json, affected_teacher_ids_json, affected_student_group_ids_json,
        affected_room_ids_json, day_of_week, period_index, violated_constraint_rule, suggested_fix
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    conflicts.forEach(c => {
      insertConf.run(
        c.id, entry.timetable_id, c.severity, c.conflictType, c.title, c.description,
        JSON.stringify(c.affectedActivityIds), JSON.stringify(c.affectedTeacherIds),
        JSON.stringify(c.affectedStudentGroupIds), JSON.stringify(c.affectedRoomIds),
        c.dayOfWeek, c.periodIndex, c.violatedConstraintRule, c.suggestedFix || null
      );
    });
  });

  res.json({
    success: true,
    data: {
      conflicts,
      qualityScore
    }
  });
});

// List all saved timetables
apiRouter.get('/timetables', (req: Request, res: Response) => {
  const tts = db.prepare('SELECT * FROM timetables ORDER BY updated_at DESC').all() as any[];
  const data = tts.map(tt => {
    const entryCount = db.prepare('SELECT COUNT(*) as cnt FROM timetable_entries WHERE timetable_id = ?').get(tt.id) as any;
    const conflictCount = db.prepare('SELECT COUNT(*) as cnt FROM conflicts WHERE timetable_id = ?').get(tt.id) as any;
    const qs = tt.quality_score_json ? JSON.parse(tt.quality_score_json) : null;
    return {
      id: tt.id,
      name: tt.name,
      academicYearId: tt.academic_year_id,
      departmentId: tt.department_id,
      version: tt.version,
      status: tt.status,
      generationMode: tt.generation_mode,
      qualityScore: qs,
      totalEntries: entryCount?.cnt || 0,
      conflictsCount: conflictCount?.cnt || 0,
      createdBy: tt.created_by,
      createdAt: tt.created_at,
      updatedAt: tt.updated_at,
      publishedAt: tt.published_at,
      isActive: tt.id === 'tt-active'
    };
  });
  res.json({ success: true, data });
});

// Create a new timetable
apiRouter.post('/timetables', (req: Request, res: Response) => {
  const {
    name = 'New Academic Timetable',
    academicYearId,
    departmentId,
    generationMode = 'MANUAL',
    createdBy = 'Timetable Coordinator'
  } = req.body;

  const ay = academicYearId || (db.prepare('SELECT id FROM academic_years LIMIT 1').get() as any)?.id || 'ay-2026';
  const newId = `tt-${Date.now()}`;

  db.prepare(`
    INSERT INTO timetables (
      id, academic_year_id, department_id, name, version, status, generation_mode, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 1, 'DRAFT', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(newId, ay, departmentId || null, name, generationMode, createdBy);

  res.json({
    success: true,
    data: {
      id: newId,
      name,
      status: 'DRAFT',
      generationMode,
      version: 1
    }
  });
});

// Duplicate / Clone timetable
apiRouter.post('/timetables/:id/duplicate', (req: Request, res: Response) => {
  const { id } = req.params;
  const source = db.prepare('SELECT * FROM timetables WHERE id = ?').get(id as string) as any;
  if (!source) {
    return res.status(404).json({ success: false, error: 'Source timetable not found' });
  }

  const newId = `tt-${Date.now()}`;
  const newName = `${source.name} (Copy)`;

  runInTransaction(() => {
    db.prepare(`
      INSERT INTO timetables (
        id, academic_year_id, department_id, name, version, status, generation_mode, profile_id, quality_score_json, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      newId, source.academic_year_id, source.department_id, newName, source.version,
      source.generation_mode, source.profile_id, source.quality_score_json, 'Timetable Coordinator'
    );

    const sourceEntries = db.prepare('SELECT * FROM timetable_entries WHERE timetable_id = ?').all(id as string) as any[];
    const insertEntry = db.prepare(`
      INSERT INTO timetable_entries (
        id, timetable_id, activity_id, day_of_week, period_index, duration, room_id, is_locked, satisfaction_explanation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    sourceEntries.forEach(e => {
      insertEntry.run(
        `ent-${newId}-${e.activity_id}-${Math.random().toString(36).substring(2, 7)}`,
        newId, e.activity_id, e.day_of_week, e.period_index, e.duration, e.room_id, e.is_locked, e.satisfaction_explanation
      );
    });
  });

  res.json({ success: true, data: { id: newId, name: newName } });
});

// Delete a timetable
apiRouter.delete('/timetables/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (id === 'tt-active') {
    return res.status(400).json({ success: false, error: 'Cannot delete primary active timetable' });
  }

  runInTransaction(() => {
    db.prepare('DELETE FROM timetable_entries WHERE timetable_id = ?').run(id as string);
    db.prepare('DELETE FROM conflicts WHERE timetable_id = ?').run(id as string);
    db.prepare('DELETE FROM timetable_versions WHERE timetable_id = ?').run(id as string);
    db.prepare('DELETE FROM timetables WHERE id = ?').run(id as string);
  });

  res.json({ success: true, message: 'Timetable deleted successfully' });
});

// Add a manual Class / Session entry to a timetable (with Combined Classes & Cross-Dept Faculty)
apiRouter.post('/timetables/entries', (req: Request, res: Response) => {
  const {
    timetableId = 'tt-active',
    activityId,
    activityName,
    courseId,
    teacherIds = [],
    sectionIds = [],
    isCombined = false,
    dayOfWeek,
    periodIndex,
    duration = 1,
    roomId,
    isLocked = false
  } = req.body;

  if (dayOfWeek === undefined || periodIndex === undefined || !roomId) {
    return res.status(400).json({ success: false, error: 'Missing required session parameters (day, period, room)' });
  }

  const entryId = `ent-${timetableId}-${Date.now()}`;

  runInTransaction(() => {
    let targetActivityId = activityId;

    // If combined class or custom cross-department faculty provided, configure activity
    if (isCombined || (teacherIds && teacherIds.length > 0) || (sectionIds && sectionIds.length > 0) || !targetActivityId) {
      if (!targetActivityId) {
        targetActivityId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const cId = courseId || (db.prepare('SELECT id FROM courses LIMIT 1').get() as any)?.id || 'crs-cs101';
        const defaultName = isCombined ? `Combined Session (${sectionIds.join(' + ')})` : (activityName || 'Academic Lecture');
        
        db.prepare(`
          INSERT INTO activities (id, code, name, course_id, activity_type, duration_periods, occurrences_per_week, total_student_count)
          VALUES (?, ?, ?, ?, 'LECTURE', ?, 1, ?)
        `).run(
          targetActivityId,
          `ACT-${Date.now().toString(36).toUpperCase()}`,
          defaultName,
          cId,
          duration,
          sectionIds.length > 1 ? sectionIds.length * 60 : 60
        );
      }

      // Assign cross-department teachers
      if (Array.isArray(teacherIds) && teacherIds.length > 0) {
        db.prepare('DELETE FROM activity_teacher_assignments WHERE activity_id = ?').run(targetActivityId);
        const insertTA = db.prepare('INSERT INTO activity_teacher_assignments (id, activity_id, teacher_id) VALUES (?, ?, ?)');
        teacherIds.forEach((tId: string) => {
          insertTA.run(`ata-${targetActivityId}-${tId}-${Date.now()}`, targetActivityId, tId);
        });
      }

      // Assign combined student sections
      if (Array.isArray(sectionIds) && sectionIds.length > 0) {
        db.prepare('DELETE FROM activity_student_assignments WHERE activity_id = ?').run(targetActivityId);
        const insertSA = db.prepare('INSERT INTO activity_student_assignments (id, activity_id, section_id) VALUES (?, ?, ?)');
        sectionIds.forEach((sId: string) => {
          insertSA.run(`asa-${targetActivityId}-${sId}-${Date.now()}`, targetActivityId, sId);
        });
      }
    }

    db.prepare(`
      INSERT INTO timetable_entries (
        id, timetable_id, activity_id, day_of_week, period_index, duration, room_id, is_locked, satisfaction_explanation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entryId, timetableId, targetActivityId, dayOfWeek, periodIndex, duration, roomId, isLocked ? 1 : 0, 
      isCombined ? 'Manually scheduled combined class' : 'Manually scheduled session'
    );

    // Recompute score and conflicts
    const context = buildProblemContext();
    const allEntriesRaw = db.prepare('SELECT * FROM timetable_entries WHERE timetable_id = ?').all(timetableId) as any[];
    const assignments: ActivityAssignment[] = allEntriesRaw.map(e => ({
      activityId: e.activity_id,
      dayOfWeek: e.day_of_week,
      periodIndex: e.period_index,
      duration: e.duration,
      roomId: e.room_id,
      isLocked: Boolean(e.is_locked)
    }));

    const conflicts = ConflictEngine.detectConflicts(assignments, context);
    const qualityScore = QualityScorer.calculate(assignments, context);

    db.prepare('UPDATE timetables SET quality_score_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      JSON.stringify(qualityScore), timetableId
    );

    db.prepare('DELETE FROM conflicts WHERE timetable_id = ?').run(timetableId);
    const insertConf = db.prepare(`
      INSERT INTO conflicts (
        id, timetable_id, severity, conflict_type, title, description,
        affected_activity_ids_json, affected_teacher_ids_json, affected_student_group_ids_json,
        affected_room_ids_json, day_of_week, period_index, violated_constraint_rule, suggested_fix
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    conflicts.forEach(c => {
      insertConf.run(
        c.id, timetableId, c.severity, c.conflictType, c.title, c.description,
        JSON.stringify(c.affectedActivityIds), JSON.stringify(c.affectedTeacherIds),
        JSON.stringify(c.affectedStudentGroupIds), JSON.stringify(c.affectedRoomIds),
        c.dayOfWeek, c.periodIndex, c.violatedConstraintRule, c.suggestedFix || null
      );
    });
  });

  res.json({ success: true, data: { entryId } });
});

// Delete a class session entry from a timetable
apiRouter.delete('/timetables/entries/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const entry = db.prepare('SELECT * FROM timetable_entries WHERE id = ?').get(id as string) as any;
  if (!entry) {
    return res.status(404).json({ success: false, error: 'Timetable entry not found' });
  }

  runInTransaction(() => {
    db.prepare('DELETE FROM timetable_entries WHERE id = ?').run(id as string);

    // Recompute score and conflicts
    const context = buildProblemContext();
    const allEntriesRaw = db.prepare('SELECT * FROM timetable_entries WHERE timetable_id = ?').all(entry.timetable_id) as any[];
    const assignments: ActivityAssignment[] = allEntriesRaw.map(e => ({
      activityId: e.activity_id,
      dayOfWeek: e.day_of_week,
      periodIndex: e.period_index,
      duration: e.duration,
      roomId: e.room_id,
      isLocked: Boolean(e.is_locked)
    }));

    const conflicts = ConflictEngine.detectConflicts(assignments, context);
    const qualityScore = QualityScorer.calculate(assignments, context);

    db.prepare('UPDATE timetables SET quality_score_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      JSON.stringify(qualityScore), entry.timetable_id
    );

    db.prepare('DELETE FROM conflicts WHERE timetable_id = ?').run(entry.timetable_id);
    const insertConf = db.prepare(`
      INSERT INTO conflicts (
        id, timetable_id, severity, conflict_type, title, description,
        affected_activity_ids_json, affected_teacher_ids_json, affected_student_group_ids_json,
        affected_room_ids_json, day_of_week, period_index, violated_constraint_rule, suggested_fix
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    conflicts.forEach(c => {
      insertConf.run(
        c.id, entry.timetable_id, c.severity, c.conflictType, c.title, c.description,
        JSON.stringify(c.affectedActivityIds), JSON.stringify(c.affectedTeacherIds),
        JSON.stringify(c.affectedStudentGroupIds), JSON.stringify(c.affectedRoomIds),
        c.dayOfWeek, c.periodIndex, c.violatedConstraintRule, c.suggestedFix || null
      );
    });
  });

  res.json({ success: true, message: 'Session deleted' });
});

// Lock / Pin toggle
apiRouter.post('/timetables/toggle-lock', (req: Request, res: Response) => {
  const { entryId } = req.body;
  const entry = db.prepare('SELECT * FROM timetable_entries WHERE id = ?').get(entryId) as any;
  if (!entry) {
    return res.status(404).json({ success: false, error: 'Entry not found' });
  }

  const newLock = entry.is_locked ? 0 : 1;
  db.prepare('UPDATE timetable_entries SET is_locked = ? WHERE id = ?').run(newLock, entryId);

  // Also reflect in activity table for semi-automatic generation
  db.prepare('UPDATE activities SET is_locked = ?, locked_day = ?, locked_period = ?, locked_room_id = ? WHERE id = ?').run(
    newLock, newLock ? entry.day_of_week : null, newLock ? entry.period_index : null, newLock ? entry.room_id : null, entry.activity_id
  );

  res.json({ success: true, isLocked: Boolean(newLock) });
});

// Publish status lifecycle
apiRouter.post('/timetables/set-status', (req: Request, res: Response) => {
  const { timetableId = 'tt-active', status } = req.body;
  db.prepare('UPDATE timetables SET status = ?, published_at = CASE WHEN ? = "PUBLISHED" THEN CURRENT_TIMESTAMP ELSE published_at END, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    status, status, timetableId
  );
  res.json({ success: true, status });
});

// ----------------------------------------------------
// 10. FET IMPORT & EXPORT
// ----------------------------------------------------
apiRouter.post('/fet/import', (req: Request, res: Response) => {
  const { xmlContent, fileName = 'timetable.fet' } = req.body;
  if (!xmlContent) {
    return res.status(400).json({ success: false, error: 'XML content is required' });
  }

  try {
    const { data, report } = FETParser.parse(xmlContent, fileName);
    res.json({ success: true, data, report });
  } catch (err: any) {
    res.status(400).json({ success: false, error: `Failed to parse FET XML: ${err.message}` });
  }
});

apiRouter.get('/fet/export/xml', (req: Request, res: Response) => {
  const univ = db.prepare('SELECT name FROM universities LIMIT 1').get() as { name: string } | undefined;
  const teachers = db.prepare('SELECT * FROM teachers').all() as Teacher[];
  const roomsRaw = db.prepare('SELECT * FROM rooms').all() as any[];
  const rooms: Room[] = roomsRaw.map(r => ({ ...r, isAccessible: Boolean(r.is_accessible), equipment: [] }));
  const buildings = db.prepare('SELECT * FROM buildings').all() as Building[];
  const context = buildProblemContext();
  const timeSlots = context.allTimeSlots;

  const xml = FETExporter.exportToXml({
    institutionName: univ?.name || 'Metropolitan Institute of Science & Technology',
    teachers,
    rooms,
    buildings,
    activities: context.activities,
    timeSlots
  });

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Content-Disposition', 'attachment; filename="timetable.fet"');
  res.send(xml);
});

// ----------------------------------------------------
// 11. AUDIT LOGS & ANALYTICS
// ----------------------------------------------------
apiRouter.get('/analytics', (req: Request, res: Response) => {
  const totalTeachers = db.prepare('SELECT COUNT(*) as c FROM teachers').get() as { c: number };
  const totalStudents = db.prepare('SELECT COUNT(*) as c FROM students').get() as { c: number };
  const totalRooms = db.prepare('SELECT COUNT(*) as c FROM rooms').get() as { c: number };
  const totalActivities = db.prepare('SELECT COUNT(*) as c FROM activities').get() as { c: number };
  const scheduledCount = db.prepare("SELECT COUNT(*) as c FROM timetable_entries WHERE timetable_id = 'tt-active'").get() as { c: number };
  const conflictsCount = db.prepare("SELECT COUNT(*) as c FROM conflicts WHERE timetable_id = 'tt-active'").get() as { c: number };

  res.json({
    success: true,
    data: {
      totalTeachers: totalTeachers.c,
      totalStudents: totalStudents.c || 240,
      totalRooms: totalRooms.c,
      totalActivities: totalActivities.c,
      scheduledCount: scheduledCount.c,
      conflictsCount: conflictsCount.c
    }
  });
});

apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50').all();
  res.json({ success: true, data: logs });
});

// ----------------------------------------------------
// 12. TIMETABLE UPLOAD & INTELLIGENT EXTRACTION ENGINE
// ----------------------------------------------------
interface ParsedSessionRow {
  dayOfWeek: number;
  dayName: string;
  periodIndex: number;
  courseCode: string;
  courseName: string;
  activityType: 'LECTURE' | 'LABORATORY' | 'TUTORIAL' | 'SEMINAR';
  duration: number;
  sectionNames: string[];
  teacherNames: string[];
  roomCode: string;
  isCombined?: boolean;
}

function parseDayString(raw: any): { dayIndex: number; dayName: string } {
  if (typeof raw === 'number' && raw >= 0 && raw <= 6) {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return { dayIndex: raw, dayName: dayNames[raw] };
  }
  const str = String(raw || '').trim().toLowerCase();
  if (str.startsWith('mon') || str === '0') return { dayIndex: 0, dayName: 'Monday' };
  if (str.startsWith('tue') || str === '1') return { dayIndex: 1, dayName: 'Tuesday' };
  if (str.startsWith('wed') || str === '2') return { dayIndex: 2, dayName: 'Wednesday' };
  if (str.startsWith('thu') || str === '3') return { dayIndex: 3, dayName: 'Thursday' };
  if (str.startsWith('fri') || str === '4') return { dayIndex: 4, dayName: 'Friday' };
  if (str.startsWith('sat') || str === '5') return { dayIndex: 5, dayName: 'Saturday' };
  if (str.startsWith('sun') || str === '6') return { dayIndex: 6, dayName: 'Sunday' };
  return { dayIndex: 0, dayName: 'Monday' };
}

function parsePeriodString(raw: any): number {
  if (typeof raw === 'number') {
    if (raw >= 1 && raw <= 8) return raw - 1; // 1-based period index
    if (raw >= 0 && raw <= 7) return raw;
  }
  const str = String(raw || '').trim().toLowerCase();
  // Extract number like "Period 3" -> 2 or "P3" -> 2 or "Slot 2" -> 1
  const periodMatch = str.match(/p(?:eriod)?\s*(\d+)/i) || str.match(/slot\s*(\d+)/i) || str.match(/^(\d+)$/);
  if (periodMatch) {
    const num = parseInt(periodMatch[1], 10);
    return num >= 1 && num <= 8 ? num - 1 : Math.max(0, Math.min(7, num));
  }
  // Time ranges
  if (str.includes('9:00') || str.includes('09:00')) return 0;
  if (str.includes('10:00')) return 1;
  if (str.includes('11:15') || str.includes('11:00')) return 2;
  if (str.includes('12:15') || str.includes('12:00')) return 3;
  if (str.includes('13:15') || str.includes('1:15')) return 4;
  if (str.includes('14:00') || str.includes('2:00')) return 5;
  if (str.includes('15:00') || str.includes('3:00')) return 6;
  if (str.includes('16:00') || str.includes('4:00')) return 7;
  return 0;
}

apiRouter.post('/timetables/upload-extract', async (req: Request, res: Response) => {
  try {
    const {
      fileBase64,
      fileName = 'timetable.xlsx',
      rawRows,
      clearExisting = true,
      timetableId = 'tt-active'
    } = req.body;

    let rowsToProcess: any[] = [];

    // Primary path: client already parsed the file into structured rows.
    // We store the extracted schedule data, not the raw file/document.
    if (rawRows && Array.isArray(rawRows) && rawRows.length > 0) {
      rowsToProcess = rawRows;
    } else if (fileBase64 && fileBase64.length > 0) {
      // Fallback: decode and parse base64 file if rawRows not provided (direct API use)
      const buffer = Buffer.from(fileBase64, 'base64');
      if (fileName.endsWith('.json')) {
        const text = buffer.toString('utf-8');
        const parsedJson = JSON.parse(text);
        rowsToProcess = Array.isArray(parsedJson) ? parsedJson : (parsedJson.sessions || parsedJson.entries || [parsedJson]);
      } else {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        rowsToProcess = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
      }
    } else {
      return res.status(400).json({ success: false, error: 'No timetable data provided. Upload an Excel/CSV file with schedule information.' });
    }

    if (!rowsToProcess || rowsToProcess.length === 0) {
      return res.status(400).json({ success: false, error: 'The uploaded file contains no data rows.' });
    }


    // Extract sessions with intelligent fuzzy header recognition
    const parsedSessions: ParsedSessionRow[] = [];

    // Helper to find header key
    const findKey = (row: any, patterns: RegExp[]): string | undefined => {
      const keys = Object.keys(row);
      for (const pattern of patterns) {
        const found = keys.find(k => pattern.test(k.trim()));
        if (found) return found;
      }
      return undefined;
    };

    // Check if table is in matrix format (e.g. Columns are Monday, Tuesday, etc.)
    const sampleRow = rowsToProcess[0] || {};
    const sampleKeys = Object.keys(sampleRow).map(k => k.toLowerCase().trim());
    const dayColumns = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].filter(d => 
      sampleKeys.some(k => k.includes(d))
    );

    if (dayColumns.length >= 2) {
      // Matrix format!
      for (let rIdx = 0; rIdx < rowsToProcess.length; rIdx++) {
        const row = rowsToProcess[rIdx];
        const periodKey = Object.keys(row).find(k => /(period|time|slot|hour)/i.test(k));
        const periodIndex = periodKey ? parsePeriodString(row[periodKey]) : rIdx % 8;

        for (const dayCol of dayColumns) {
          const matchingKey = Object.keys(row).find(k => k.toLowerCase().trim().includes(dayCol));
          if (!matchingKey) continue;
          const cellVal = String(row[matchingKey] || '').trim();
          if (!cellVal || cellVal.toLowerCase() === 'break' || cellVal.toLowerCase() === 'lunch' || cellVal === '-') continue;

          // Parse cellVal e.g. "CS301 (CSE-A)\nDr. Alan Turing\nCR-201"
          const lines = cellVal.split(/[\n;\r]+/).map(s => s.trim()).filter(Boolean);
          let courseCode = 'CS301';
          let courseName = 'Academic Session';
          let sectionNames = ['CSE-A'];
          let teacherNames = ['Faculty Instructor'];
          let roomCode = 'CR-201';

          if (lines.length === 1) {
            // e.g. "CS301 - Data Structures | CSE-A | Dr. Turing | CR-201"
            const parts = lines[0].split(/[|,\-–]/).map(s => s.trim()).filter(Boolean);
            if (parts[0]) courseCode = parts[0];
            if (parts[1]) courseName = parts[1];
            if (parts[2]) sectionNames = [parts[2]];
            if (parts[3]) teacherNames = [parts[3]];
            if (parts[4]) roomCode = parts[4];
          } else {
            // Multiple lines
            const line0 = lines[0] || '';
            const codeMatch = line0.match(/^([A-Z0-9]{3,8})/i);
            if (codeMatch) courseCode = codeMatch[1].toUpperCase();
            courseName = line0.replace(codeMatch ? codeMatch[0] : '', '').replace(/[()\-–]/g, ' ').trim() || courseCode;

            // Check for section in line 0 or line 1
            const secMatch = cellVal.match(/(CSE-[A-Z]|AIDS-[A-Z]|AIML-[A-Z]|CS-[A-Z]|Sec-[A-Z]|[A-Z]{2,4}-[A-Z])/i);
            if (secMatch) sectionNames = [secMatch[0].toUpperCase()];

            if (lines.length > 1) {
              teacherNames = [lines[1].replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i, 'Prof. ')];
            }
            if (lines.length > 2) {
              const rmMatch = lines[2].match(/(CR-\d+|LAB-[A-Z0-9\-]+|AUD-\d+|[A-Z0-9\-]{2,10})/i);
              if (rmMatch) roomCode = rmMatch[0].toUpperCase();
            }
          }

          const { dayIndex, dayName } = parseDayString(dayCol);
          parsedSessions.push({
            dayOfWeek: dayIndex,
            dayName,
            periodIndex,
            courseCode: courseCode.toUpperCase(),
            courseName: courseName || courseCode,
            activityType: courseName.toLowerCase().includes('lab') ? 'LABORATORY' : 'LECTURE',
            duration: 1,
            sectionNames,
            teacherNames,
            roomCode: roomCode.toUpperCase(),
            isCombined: sectionNames.length > 1 || teacherNames.length > 1
          });
        }
      }
    } else {
      // Standard Columnar Format
      for (const row of rowsToProcess) {
        const dayKey = findKey(row, [/(day|weekday|day_of_week|day of week)/i]);
        const periodKey = findKey(row, [/(period|slot|period_index|period index|time|hour)/i]);
        const codeKey = findKey(row, [/(course_?code|sub(ject)?_?code|code)/i]);
        const nameKey = findKey(row, [/(course_?name|sub(ject)?_?name|course|subject|title|name)/i]);
        const typeKey = findKey(row, [/(activity_?type|type|class_?type|session_?type)/i]);
        const secKey = findKey(row, [/(section|sections|class|classes|batch|cohort|cohorts|target)/i]);
        const teacherKey = findKey(row, [/(teacher|teachers|faculty|instructor|prof|professor)/i]);
        const roomKey = findKey(row, [/(room|venue|hall|lab|classroom|location)/i]);
        const durKey = findKey(row, [/(duration|periods|hours)/i]);

        const rawDay = dayKey ? row[dayKey] : 0;
        const rawPeriod = periodKey ? row[periodKey] : 0;
        const { dayIndex, dayName } = parseDayString(rawDay);
        const periodIndex = parsePeriodString(rawPeriod);

        const courseCode = String(codeKey ? row[codeKey] : (nameKey ? String(row[nameKey]).slice(0, 6) : 'CS301')).trim().toUpperCase() || 'CS301';
        const courseName = String(nameKey ? row[nameKey] : courseCode).trim() || courseCode;

        let rawType = String(typeKey ? row[typeKey] : '').toUpperCase().trim();
        let activityType: 'LECTURE' | 'LABORATORY' | 'TUTORIAL' | 'SEMINAR' = 'LECTURE';
        if (rawType.includes('LAB') || courseName.toLowerCase().includes('lab')) activityType = 'LABORATORY';
        else if (rawType.includes('TUT')) activityType = 'TUTORIAL';
        else if (rawType.includes('SEM')) activityType = 'SEMINAR';

        const rawSec = secKey ? String(row[secKey]) : 'CSE-A';
        const sectionNames = rawSec.split(/[,;&+/]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
        if (sectionNames.length === 0) sectionNames.push('CSE-A');

        const rawTeacher = teacherKey ? String(row[teacherKey]) : 'Faculty Instructor';
        const teacherNames = rawTeacher.split(/[,;&+/]+/).map(s => s.trim()).filter(Boolean);
        if (teacherNames.length === 0) teacherNames.push('Faculty Instructor');

        const roomCode = String(roomKey ? row[roomKey] : (activityType === 'LABORATORY' ? 'LAB-CSE-1' : 'CR-201')).trim().toUpperCase() || 'CR-201';
        const duration = durKey ? Math.max(1, parseInt(String(row[durKey]), 10) || 1) : 1;

        parsedSessions.push({
          dayOfWeek: dayIndex,
          dayName,
          periodIndex,
          courseCode,
          courseName,
          activityType,
          duration,
          sectionNames,
          teacherNames,
          roomCode,
          isCombined: sectionNames.length > 1 || teacherNames.length > 1
        });
      }
    }

    if (parsedSessions.length === 0) {
      return res.status(400).json({ success: false, error: 'Could not extract any timetable sessions from the uploaded file.' });
    }

    // Now insert / resolve entities in Database
    const departmentMap: Record<string, string> = {
      'CSE': 'dept-cse',
      'AIDS': 'dept-aids',
      'AI&DS': 'dept-aids',
      'AIML': 'dept-aiml',
      'AI&ML': 'dept-aiml',
      'CS': 'dept-cs',
      'CYBER': 'dept-cs',
      'CYS': 'dept-cs'
    };

    const determineDeptId = (str: string): string => {
      const upper = str.toUpperCase();
      for (const [key, dId] of Object.entries(departmentMap)) {
        if (upper.includes(key)) return dId;
      }
      return 'dept-cse';
    };

    const insertedEntriesCount = runInTransaction(() => {
      if (clearExisting) {
        db.prepare('DELETE FROM timetable_entries WHERE timetable_id = ?').run(timetableId);
        db.prepare('DELETE FROM conflicts WHERE timetable_id = ?').run(timetableId);
        writeThroughPg('DELETE FROM timetable_entries WHERE timetable_id = ?', [timetableId]);
        writeThroughPg('DELETE FROM conflicts WHERE timetable_id = ?', [timetableId]);
      }

      // Pre-fetch caches
      const allDepts = db.prepare('SELECT id FROM departments').all() as any[];
      const defaultDeptId = allDepts[0]?.id || 'dept-cse';
      const allBatches = db.prepare('SELECT id, program_id FROM batches').all() as any[];
      const defaultBatchId = allBatches[0]?.id || 'batch-cse-2025';
      const allSems = db.prepare('SELECT id FROM semesters').all() as any[];
      const defaultSemId = allSems[0]?.id || 'sem-cse-3';
      const bldMain = 'bld-apollo-tech';

      // Ensure building exists
      db.prepare(`
        INSERT INTO buildings (id, campus_id, name, code, total_floors)
        VALUES (?, 'campus-main', 'Apollo Technology Tower', 'APOLLO-TOW', 5)
        ON CONFLICT (id) DO NOTHING
      `).run(bldMain);

      const existingSections = new Map<string, string>();
      (db.prepare('SELECT id, name FROM sections').all() as any[]).forEach(s => {
        existingSections.set(s.name.toUpperCase(), s.id);
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

      const insertEntryStmt = db.prepare(`
        INSERT INTO timetable_entries (
          id, timetable_id, activity_id, day_of_week, period_index, duration, room_id, is_locked, satisfaction_explanation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
      `);

      let processedCount = 0;

      for (let i = 0; i < parsedSessions.length; i++) {
        const session = parsedSessions[i];
        const deptId = determineDeptId(session.sectionNames.join(' ') + ' ' + session.courseCode);

        // 1. Resolve / Create Course
        let courseId = existingCourses.get(session.courseCode);
        if (!courseId) {
          courseId = `crs-${session.courseCode.toLowerCase().replace(/[^a-z0-9]/g, '') || ('c' + i)}`;
          const progId = deptId.replace('dept-', 'prog-');
          try {
            db.prepare(`
              INSERT INTO courses (id, code, name, department_id, program_id, semester_number, credits, course_type, required_room_type)
              VALUES (?, ?, ?, ?, ?, 3, 3, ?, ?)
              ON CONFLICT (id) DO NOTHING
            `).run(courseId, session.courseCode, session.courseName, deptId, progId, session.activityType, session.activityType === 'LABORATORY' ? 'COMPUTER_LAB' : 'CLASSROOM');
            
            writeThroughPg(`
              INSERT INTO courses (id, code, name, department_id, program_id, semester_number, credits, course_type, required_room_type)
              VALUES (?, ?, ?, ?, ?, 3, 3, ?, ?)
              ON CONFLICT (id) DO NOTHING
            `, [courseId, session.courseCode, session.courseName, deptId, progId, session.activityType, session.activityType === 'LABORATORY' ? 'COMPUTER_LAB' : 'CLASSROOM']);
            
            existingCourses.set(session.courseCode, courseId);
          } catch (e) {}
        }

        // 2. Resolve / Create Sections
        const resolvedSectionIds: string[] = [];
        for (const secName of session.sectionNames) {
          let sId = existingSections.get(secName);
          if (!sId) {
            sId = `sec-${secName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            const targetBatch = allBatches.find(b => b.program_id === deptId.replace('dept-', 'prog-'))?.id || defaultBatchId;
            const targetSem = allSems.find(s => s.id.includes(deptId.replace('dept-', '')))?.id || defaultSemId;
            try {
              db.prepare(`
                INSERT INTO sections (id, batch_id, semester_id, name, student_count)
                VALUES (?, ?, ?, ?, 60)
                ON CONFLICT (id) DO NOTHING
              `).run(sId, targetBatch, targetSem, secName);
              
              writeThroughPg(`
                INSERT INTO sections (id, batch_id, semester_id, name, student_count)
                VALUES (?, ?, ?, ?, 60)
                ON CONFLICT (id) DO NOTHING
              `, [sId, targetBatch, targetSem, secName]);
              
              existingSections.set(secName, sId);
            } catch (e) {}
          }
          resolvedSectionIds.push(sId);
        }

        // 3. Resolve / Create Teachers
        const resolvedTeacherIds: string[] = [];
        for (const tName of session.teacherNames) {
          const tKey = tName.toLowerCase().trim();
          let tId = existingTeachers.get(tKey);
          if (!tId) {
            const cleanSlug = tName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
            tId = `tch-${cleanSlug || ('t' + i)}`;
            const empId = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
            const email = `${cleanSlug || 'faculty'}@apollouniversity.edu.in`;
            try {
              db.prepare(`
                INSERT INTO teachers (id, employee_id, name, email, department_id, max_consecutive_periods, max_periods_per_day, max_periods_per_week)
                VALUES (?, ?, ?, ?, ?, 3, 5, 20)
                ON CONFLICT (id) DO NOTHING
              `).run(tId, empId, tName, email, deptId);

              writeThroughPg(`
                INSERT INTO teachers (id, employee_id, name, email, department_id, max_consecutive_periods, max_periods_per_day, max_periods_per_week)
                VALUES (?, ?, ?, ?, ?, 3, 5, 20)
                ON CONFLICT (id) DO NOTHING
              `, [tId, empId, tName, email, deptId]);

              existingTeachers.set(tKey, tId);
            } catch (e) {}
          }
          resolvedTeacherIds.push(tId);
        }

        // 4. Resolve / Create Room
        let roomId = existingRooms.get(session.roomCode);
        if (!roomId) {
          roomId = `room-${session.roomCode.toLowerCase().replace(/[^a-z0-9]/g, '') || ('r' + i)}`;
          const rType = session.activityType === 'LABORATORY' || session.roomCode.includes('LAB') ? 'COMPUTER_LAB' : 'CLASSROOM';
          try {
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
          } catch (e) {}
        }

        // 5. Create Activity Record
        const actId = `act-${timetableId}-${i}-${Date.now()}`;
        const actName = `${session.courseName} (${session.sectionNames.join(', ')})`;
        const studentCount = session.sectionNames.length * 60;

        db.prepare(`
          INSERT INTO activities (
            id, code, name, course_id, activity_type, duration_periods, occurrences_per_week, total_student_count, required_room_type
          ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        `).run(actId, `ACT-${session.courseCode}-${i}`, actName, courseId, session.activityType, session.duration, studentCount, session.activityType === 'LABORATORY' ? 'COMPUTER_LAB' : 'CLASSROOM');

        writeThroughPg(`
          INSERT INTO activities (
            id, code, name, course_id, activity_type, duration_periods, occurrences_per_week, total_student_count, required_room_type
          ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        `, [actId, `ACT-${session.courseCode}-${i}`, actName, courseId, session.activityType, session.duration, studentCount, session.activityType === 'LABORATORY' ? 'COMPUTER_LAB' : 'CLASSROOM']);

        // Insert Teacher Assignments
        for (const tId of resolvedTeacherIds) {
          const assId = `ata-${actId}-${tId}`;
          db.prepare('INSERT INTO activity_teacher_assignments (id, activity_id, teacher_id) VALUES (?, ?, ?)').run(assId, actId, tId);
          writeThroughPg('INSERT INTO activity_teacher_assignments (id, activity_id, teacher_id) VALUES (?, ?, ?)', [assId, actId, tId]);
        }

        // Insert Student Section Assignments
        for (const sId of resolvedSectionIds) {
          const assId = `asa-${actId}-${sId}`;
          db.prepare('INSERT INTO activity_student_assignments (id, activity_id, section_id) VALUES (?, ?, ?)').run(assId, actId, sId);
          writeThroughPg('INSERT INTO activity_student_assignments (id, activity_id, section_id) VALUES (?, ?, ?)', [assId, actId, sId]);
        }

        // 6. Insert Timetable Entry
        const entryId = `ent-${timetableId}-${i}-${session.dayOfWeek}-${session.periodIndex}`;
        const explanation = `Imported session for ${session.sectionNames.join(', ')} with ${session.teacherNames.join(', ')} in ${session.roomCode}`;

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
          INSERT INTO timetable_entries (id, timetable_id, activity_id, day_of_week, period_index, duration, room_id, is_locked, satisfaction_explanation)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
        `, [entryId, timetableId, actId, session.dayOfWeek, session.periodIndex, session.duration, roomId, explanation]);

        processedCount++;
      }

      return processedCount;
    });

    // Recalculate Quality Score & Conflicts
    const context = buildProblemContext();
    const allEntriesRaw = db.prepare('SELECT * FROM timetable_entries WHERE timetable_id = ?').all(timetableId) as any[];
    const assignments: ActivityAssignment[] = allEntriesRaw.map(e => ({
      activityId: e.activity_id,
      dayOfWeek: e.day_of_week,
      periodIndex: e.period_index,
      duration: e.duration,
      roomId: e.room_id,
      isLocked: Boolean(e.is_locked)
    }));

    const conflicts = ConflictEngine.detectConflicts(assignments, context);
    const qualityScore = QualityScorer.calculate(assignments, context);

    runInTransaction(() => {
      db.prepare(`
        UPDATE timetables
        SET quality_score_json = ?, status = 'PUBLISHED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(JSON.stringify(qualityScore), timetableId);

      writeThroughPg(`
        UPDATE timetables
        SET quality_score_json = ?, status = 'PUBLISHED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [JSON.stringify(qualityScore), timetableId]);

      db.prepare('DELETE FROM conflicts WHERE timetable_id = ?').run(timetableId);
      writeThroughPg('DELETE FROM conflicts WHERE timetable_id = ?', [timetableId]);

      const insertConf = db.prepare(`
        INSERT INTO conflicts (
          id, timetable_id, severity, conflict_type, title, description,
          affected_activity_ids_json, affected_teacher_ids_json, affected_student_group_ids_json,
          affected_room_ids_json, day_of_week, period_index, violated_constraint_rule, suggested_fix
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      conflicts.forEach(c => {
        insertConf.run(
          c.id, timetableId, c.severity, c.conflictType, c.title, c.description,
          JSON.stringify(c.affectedActivityIds), JSON.stringify(c.affectedTeacherIds),
          JSON.stringify(c.affectedStudentGroupIds), JSON.stringify(c.affectedRoomIds),
          c.dayOfWeek, c.periodIndex, c.violatedConstraintRule, c.suggestedFix || null
        );

        writeThroughPg(`
          INSERT INTO conflicts (
            id, timetable_id, severity, conflict_type, title, description,
            affected_activity_ids_json, affected_teacher_ids_json, affected_student_group_ids_json,
            affected_room_ids_json, day_of_week, period_index, violated_constraint_rule, suggested_fix
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          c.id, timetableId, c.severity, c.conflictType, c.title, c.description,
          JSON.stringify(c.affectedActivityIds), JSON.stringify(c.affectedTeacherIds),
          JSON.stringify(c.affectedStudentGroupIds), JSON.stringify(c.affectedRoomIds),
          c.dayOfWeek, c.periodIndex, c.violatedConstraintRule, c.suggestedFix || null
        ]);
      });
    });

    res.json({
      success: true,
      data: {
        extractedSessionsCount: parsedSessions.length,
        insertedEntriesCount,
        conflictsCount: conflicts.length,
        qualityScore,
        sessionsPreview: parsedSessions.slice(0, 10)
      }
    });
  } catch (error: any) {
    console.error('Upload & Extraction Engine Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to extract timetable file' });
  }
});

// ----------------------------------------------------
// 13. ADMIN DATABASE RESET TO CLEAN 4-DEPT STATE
// ----------------------------------------------------
apiRouter.post('/admin/reset-database', async (req: Request, res: Response) => {
  try {
    console.log('Initiating database reset to clean 4-department configuration...');
    seedDatabase(true);
    if (isPostgresConfigured) {
      await seedPostgres(true);
    }
    res.json({
      success: true,
      message: 'Database successfully reset to clean 4-department structure with Super Admin credentials.'
    });
  } catch (err: any) {
    console.error('Reset database failed:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to reset database' });
  }
});

// ----------------------------------------------------
// 13.1 MIGRATE: ADD SATURDAY TIME SLOTS TO EXISTING DB
// ----------------------------------------------------
apiRouter.post('/admin/migrate-add-saturday', async (req: Request, res: Response) => {
  try {
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

    let added = 0;
    const insertSlot = db.prepare(`
      INSERT INTO time_slots (id, day_of_week, day_name, period_index, start_time, end_time, is_break, label)
      VALUES (?, 5, 'Saturday', ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO NOTHING
    `);

    runInTransaction(() => {
      for (const p of periodTemplates) {
        const result = insertSlot.run(
          `slot-5-${p.index}`, p.index, p.start, p.end, p.isBreak, p.label
        );
        added += Number(result.changes);
      }
    });

    // Mirror to Postgres if configured
    if (isPostgresConfigured) {
      for (const p of periodTemplates) {
        await writeThroughPg(`
          INSERT INTO time_slots (id, day_of_week, day_name, period_index, start_time, end_time, is_break, label)
          VALUES (?, 5, 'Saturday', ?, ?, ?, ?, ?)
          ON CONFLICT (id) DO NOTHING
        `, [`slot-5-${p.index}`, p.index, p.start, p.end, p.isBreak, p.label]);
      }
    }

    res.json({
      success: true,
      message: `Saturday time slots migration complete. ${added} new slots added.`,
      slotsAdded: added
    });
  } catch (err: any) {
    console.error('Saturday migration failed:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to add Saturday slots' });
  }
});


// ----------------------------------------------------
// 14. AI NATURAL LANGUAGE TIMETABLE ASSISTANT
// ----------------------------------------------------
apiRouter.post('/timetables/ai-edit-prompt', async (req: Request, res: Response) => {
  try {
    const { prompt, timetableId = 'tt-active' } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'Natural language prompt is required' });
    }

    const context = buildProblemContext();
    const entriesRaw = db.prepare('SELECT * FROM timetable_entries WHERE timetable_id = ?').all(timetableId) as any[];
    const courses = db.prepare('SELECT * FROM courses').all() as Course[];
    const courseMap = new Map(courses.map(c => [c.id, c]));
    const teachers = Array.from(context.teachers.values());
    const rooms = Array.from(context.rooms.values());
    const sections = db.prepare('SELECT id, name FROM sections').all() as { id: string; name: string }[];
    const actMap = new Map(context.activities.map(a => [a.id, a]));

    const entries: TimetableEntry[] = entriesRaw.map(e => {
      const act = actMap.get(e.activity_id);
      const crs = act ? courseMap.get(act.courseId) : undefined;
      const rm = context.rooms.get(e.room_id);
      return {
        id: e.id,
        timetableId: e.timetable_id,
        activityId: e.activity_id,
        activityName: act?.name || 'Class',
        courseCode: crs?.code || 'CRS',
        courseName: crs?.name || 'Course',
        activityType: act?.activityType || 'LECTURE',
        teacherIds: act?.teacherIds || [],
        teacherNames: (act?.teacherIds || []).map(tId => context.teachers.get(tId)?.name || tId),
        sectionNames: act?.sectionIds || [],
        groupNames: [],
        subgroupNames: [],
        dayOfWeek: e.day_of_week,
        periodIndex: e.period_index,
        duration: e.duration,
        roomId: e.room_id,
        roomName: rm?.name || e.room_id,
        buildingName: 'Apollo Tower',
        isLocked: Boolean(e.is_locked),
        isCombined: Boolean(act && (act.sectionIds.length > 1 || act.teacherIds.length > 1))
      };
    });

    const analysis = await NLPTimetableEditor.analyzePrompt(prompt, {
      entries,
      courses,
      teachers,
      rooms,
      sections,
      problemContext: context
    });

    res.json({ success: true, data: analysis });
  } catch (err: any) {
    console.error('AI Edit Prompt Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to process AI timetable command' });
  }
});

apiRouter.post('/timetables/ai-apply-changes', async (req: Request, res: Response) => {
  try {
    const { operations, timetableId = 'tt-active' } = req.body;
    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({ success: false, error: 'No operations provided to apply' });
    }

    const defaultBuilding = 'bld-apollo-tech';
    const allBatches = db.prepare('SELECT id, program_id FROM batches').all() as any[];
    const allSems = db.prepare('SELECT id FROM semesters').all() as any[];

    runInTransaction(() => {
      for (const op of operations) {
        if (op.type === 'MOVE_ENTRY' && op.entryId) {
          db.prepare(`
            UPDATE timetable_entries
            SET day_of_week = COALESCE(?, day_of_week),
                period_index = COALESCE(?, period_index),
                room_id = COALESCE(?, room_id)
            WHERE id = ?
          `).run(op.targetDayOfWeek ?? op.dayOfWeek, op.targetPeriodIndex ?? op.periodIndex, op.targetRoomId || null, op.entryId);

          writeThroughPg(`
            UPDATE timetable_entries
            SET day_of_week = COALESCE(?, day_of_week),
                period_index = COALESCE(?, period_index),
                room_id = COALESCE(?, room_id)
            WHERE id = ?
          `, [op.targetDayOfWeek ?? op.dayOfWeek, op.targetPeriodIndex ?? op.periodIndex, op.targetRoomId || null, op.entryId]);
        } else if (op.type === 'SWAP_ENTRIES' && op.entryIds && op.entryIds.length >= 2) {
          const e1 = db.prepare('SELECT * FROM timetable_entries WHERE id = ?').get(op.entryIds[0]) as any;
          const e2 = db.prepare('SELECT * FROM timetable_entries WHERE id = ?').get(op.entryIds[1]) as any;
          if (e1 && e2) {
            db.prepare('UPDATE timetable_entries SET day_of_week = ?, period_index = ?, room_id = ? WHERE id = ?')
              .run(e2.day_of_week, e2.period_index, e2.room_id, e1.id);
            db.prepare('UPDATE timetable_entries SET day_of_week = ?, period_index = ?, room_id = ? WHERE id = ?')
              .run(e1.day_of_week, e1.period_index, e1.room_id, e2.id);

            writeThroughPg('UPDATE timetable_entries SET day_of_week = ?, period_index = ?, room_id = ? WHERE id = ?', [e2.day_of_week, e2.period_index, e2.room_id, e1.id]);
            writeThroughPg('UPDATE timetable_entries SET day_of_week = ?, period_index = ?, room_id = ? WHERE id = ?', [e1.day_of_week, e1.period_index, e1.room_id, e2.id]);
          }
        } else if (op.type === 'CREATE_COMBINED' || op.type === 'ADD_SESSION') {
          const targetSectionIds = op.targetSectionIds || ['sec-cse-a'];
          const targetTeacherIds = op.targetTeacherIds || ['tch-1'];
          const courseCode = op.courseCode || 'CS301';
          const courseName = op.courseName || 'Academic Class';
          const roomId = op.targetRoomId || 'room-aud-101';
          const duration = op.duration || 1;
          const day = op.dayOfWeek || 0;
          const period = op.periodIndex || 0;

          // 1. Resolve Course
          let existingCourse = db.prepare('SELECT id FROM courses WHERE code = ?').get(courseCode) as any;
          let courseId = existingCourse?.id;
          if (!courseId) {
            courseId = `crs-${courseCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            db.prepare(`
              INSERT INTO courses (id, code, name, department_id, program_id, semester_number, credits, course_type, required_room_type)
              VALUES (?, ?, ?, 'dept-cse', 'prog-cse-btech', 3, 3, ?, ?)
              ON CONFLICT (id) DO NOTHING
            `).run(courseId, courseCode, courseName, op.activityType || 'LECTURE', op.activityType === 'LABORATORY' ? 'COMPUTER_LAB' : 'CLASSROOM');

            writeThroughPg(`
              INSERT INTO courses (id, code, name, department_id, program_id, semester_number, credits, course_type, required_room_type)
              VALUES (?, ?, ?, 'dept-cse', 'prog-cse-btech', 3, 3, ?, ?)
              ON CONFLICT (id) DO NOTHING
            `, [courseId, courseCode, courseName, op.activityType || 'LECTURE', op.activityType === 'LABORATORY' ? 'COMPUTER_LAB' : 'CLASSROOM']);
          }

          // 2. Create Activity
          const actId = `act-ai-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const actName = `${courseName} (${targetSectionIds.join(', ')})`;
          const studentCount = targetSectionIds.length * 60;

          db.prepare(`
            INSERT INTO activities (
              id, code, name, course_id, activity_type, duration_periods, occurrences_per_week, total_student_count, required_room_type
            ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
          `).run(actId, `ACT-${courseCode}-AI`, actName, courseId, op.activityType || 'LECTURE', duration, studentCount, op.activityType === 'LABORATORY' ? 'COMPUTER_LAB' : 'CLASSROOM');

          writeThroughPg(`
            INSERT INTO activities (
              id, code, name, course_id, activity_type, duration_periods, occurrences_per_week, total_student_count, required_room_type
            ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
          `, [actId, `ACT-${courseCode}-AI`, actName, courseId, op.activityType || 'LECTURE', duration, studentCount, op.activityType === 'LABORATORY' ? 'COMPUTER_LAB' : 'CLASSROOM']);

          // 3. Assign Teachers
          for (const tId of targetTeacherIds) {
            const ataId = `ata-${actId}-${tId}`;
            db.prepare('INSERT INTO activity_teacher_assignments (id, activity_id, teacher_id) VALUES (?, ?, ?)').run(ataId, actId, tId);
            writeThroughPg('INSERT INTO activity_teacher_assignments (id, activity_id, teacher_id) VALUES (?, ?, ?)', [ataId, actId, tId]);
          }

          // 4. Assign Student Sections
          for (const sId of targetSectionIds) {
            const asaId = `asa-${actId}-${sId}`;
            db.prepare('INSERT INTO activity_student_assignments (id, activity_id, section_id) VALUES (?, ?, ?)').run(asaId, actId, sId);
            writeThroughPg('INSERT INTO activity_student_assignments (id, activity_id, section_id) VALUES (?, ?, ?)', [asaId, actId, sId]);
          }

          // 5. Insert Entry
          const entryId = `ent-ai-${actId}-${day}-${period}`;
          const explanation = `AI-scheduled session for ${targetSectionIds.join(', ')} with ${targetTeacherIds.join(', ')} in room ${roomId}`;

          db.prepare(`
            INSERT INTO timetable_entries (id, timetable_id, activity_id, day_of_week, period_index, duration, room_id, is_locked, satisfaction_explanation)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
          `).run(entryId, timetableId, actId, day, period, duration, roomId, explanation);

          writeThroughPg(`
            INSERT INTO timetable_entries (id, timetable_id, activity_id, day_of_week, period_index, duration, room_id, is_locked, satisfaction_explanation)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
          `, [entryId, timetableId, actId, day, period, duration, roomId, explanation]);
        } else if (op.type === 'DELETE_ENTRY' && op.entryId) {
          db.prepare('DELETE FROM timetable_entries WHERE id = ?').run(op.entryId);
          writeThroughPg('DELETE FROM timetable_entries WHERE id = ?', [op.entryId]);
        }
      }

      // Recalculate conflicts and quality score
      const context = buildProblemContext();
      const allEntriesRaw = db.prepare('SELECT * FROM timetable_entries WHERE timetable_id = ?').all(timetableId) as any[];
      const assignments: ActivityAssignment[] = allEntriesRaw.map(e => ({
        activityId: e.activity_id,
        dayOfWeek: e.day_of_week,
        periodIndex: e.period_index,
        duration: e.duration,
        roomId: e.room_id,
        isLocked: Boolean(e.is_locked)
      }));

      const conflicts = ConflictEngine.detectConflicts(assignments, context);
      const qualityScore = QualityScorer.calculate(assignments, context);

      db.prepare('UPDATE timetables SET quality_score_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        JSON.stringify(qualityScore), timetableId
      );
      writeThroughPg('UPDATE timetables SET quality_score_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        JSON.stringify(qualityScore), timetableId
      ]);

      db.prepare('DELETE FROM conflicts WHERE timetable_id = ?').run(timetableId);
      writeThroughPg('DELETE FROM conflicts WHERE timetable_id = ?', [timetableId]);

      const insertConf = db.prepare(`
        INSERT INTO conflicts (
          id, timetable_id, severity, conflict_type, title, description,
          affected_activity_ids_json, affected_teacher_ids_json, affected_student_group_ids_json,
          affected_room_ids_json, day_of_week, period_index, violated_constraint_rule, suggested_fix
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      conflicts.forEach(c => {
        insertConf.run(
          c.id, timetableId, c.severity, c.conflictType, c.title, c.description,
          JSON.stringify(c.affectedActivityIds), JSON.stringify(c.affectedTeacherIds),
          JSON.stringify(c.affectedStudentGroupIds), JSON.stringify(c.affectedRoomIds),
          c.dayOfWeek, c.periodIndex, c.violatedConstraintRule, c.suggestedFix || null
        );

        writeThroughPg(`
          INSERT INTO conflicts (
            id, timetable_id, severity, conflict_type, title, description,
            affected_activity_ids_json, affected_teacher_ids_json, affected_student_group_ids_json,
            affected_room_ids_json, day_of_week, period_index, violated_constraint_rule, suggested_fix
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          c.id, timetableId, c.severity, c.conflictType, c.title, c.description,
          JSON.stringify(c.affectedActivityIds), JSON.stringify(c.affectedTeacherIds),
          JSON.stringify(c.affectedStudentGroupIds), JSON.stringify(c.affectedRoomIds),
          c.dayOfWeek, c.periodIndex, c.violatedConstraintRule, c.suggestedFix || null
        ]);
      });
    });

    res.json({ success: true, message: 'AI timetable changes applied successfully.' });
  } catch (err: any) {
    console.error('AI Apply Changes Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to apply AI timetable changes' });
  }
});

// ============================================================
// 15. EMAIL DISPATCH — Send timetables to all faculty
// ============================================================
apiRouter.post('/admin/dispatch-timetables', async (req: Request, res: Response) => {
  try {
    const { timetableId = 'tt-active' } = req.body;

    const teachers = db.prepare('SELECT id, name, email FROM teachers').all() as any[];
    const entriesRaw = db.prepare('SELECT * FROM timetable_entries WHERE timetable_id = ?').all(timetableId) as any[];
    const activities = db.prepare('SELECT * FROM activities').all() as any[];
    const actTeachers = db.prepare('SELECT * FROM activity_teacher_assignments').all() as any[];
    const actSections = db.prepare('SELECT activity_id, s.name as section_name FROM activity_student_assignments asa LEFT JOIN sections s ON s.id = asa.section_id').all() as any[];
    const courses = db.prepare('SELECT id, code, name FROM courses').all() as any[];
    const rooms = db.prepare('SELECT id, code FROM rooms').all() as any[];

    const actMap = new Map(activities.map((a: any) => [a.id, a]));
    const courseMap = new Map(courses.map((c: any) => [c.id, c]));
    const roomMap = new Map(rooms.map((r: any) => [r.id, r]));

    // Build per-teacher session lists
    const teacherSessions = new Map<string, any[]>();
    for (const teacher of teachers) {
      const myActivityIds = actTeachers.filter((at: any) => at.teacher_id === teacher.id).map((at: any) => at.activity_id);
      const myEntries = entriesRaw.filter((e: any) => myActivityIds.includes(e.activity_id));

      const sessions = myEntries.map((e: any) => {
        const act = actMap.get(e.activity_id);
        const course = act ? courseMap.get(act.course_id) : null;
        const room = roomMap.get(e.room_id);
        const sectionNames = actSections.filter((as: any) => as.activity_id === e.activity_id).map((as: any) => as.section_name || 'Unknown').filter(Boolean);
        return {
          dayOfWeek: e.day_of_week,
          periodIndex: e.period_index,
          courseName: course?.name || act?.name || 'Session',
          courseCode: course?.code || 'N/A',
          sectionNames: sectionNames.length > 0 ? sectionNames : ['TBD'],
          roomCode: room?.code || 'TBD',
          activityType: act?.activity_type || 'LECTURE',
          duration: e.duration || 1
        };
      });

      teacherSessions.set(teacher.id, sessions);
    }

    const payloads = teachers.map((t: any) => ({
      teacherId: t.id,
      teacherName: t.name,
      teacherEmail: t.email,
      sessions: teacherSessions.get(t.id) || []
    }));

    const result = await dispatchTimetablesToFaculty(payloads);

    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Dispatch timetables error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to dispatch timetables' });
  }
});

// ============================================================
// 16. TIME SLOTS CRUD (Admin Editable Periods)
// ============================================================
apiRouter.get('/admin/calendar/slots', (req: Request, res: Response) => {
  try {
    const slots = db.prepare('SELECT * FROM time_slots ORDER BY day_of_week, period_index').all();
    res.json({ success: true, data: slots });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.put('/admin/calendar/slots/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { start_time, end_time, label, is_break } = req.body;
    db.prepare('UPDATE time_slots SET start_time=?, end_time=?, label=?, is_break=? WHERE id=?')
      .run(start_time, end_time, label, is_break ? 1 : 0, id);
    await writeThroughPg('UPDATE time_slots SET start_time=$1, end_time=$2, label=$3, is_break=$4 WHERE id=$5',
      [start_time, end_time, label, is_break ? 1 : 0, id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/admin/calendar/slots', async (req: Request, res: Response) => {
  try {
    const { day_of_week, day_name, period_index, start_time, end_time, label, is_break } = req.body;
    const id = `slot-${day_of_week}-${period_index}-${Date.now()}`;
    db.prepare('INSERT INTO time_slots (id, day_of_week, day_name, period_index, start_time, end_time, is_break, label) VALUES (?,?,?,?,?,?,?,?)')
      .run(id, day_of_week, day_name, period_index, start_time, end_time, is_break ? 1 : 0, label);
    await writeThroughPg('INSERT INTO time_slots (id, day_of_week, day_name, period_index, start_time, end_time, is_break, label) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [id, day_of_week, day_name, period_index, start_time, end_time, is_break ? 1 : 0, label]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/admin/calendar/slots/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM time_slots WHERE id=?').run(id);
    await writeThroughPg('DELETE FROM time_slots WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 17. ROOMS + BUILDINGS CRUD
// ============================================================
apiRouter.get('/admin/rooms', (req: Request, res: Response) => {
  try {
    const rooms = db.prepare('SELECT r.*, b.name as building_name FROM rooms r LEFT JOIN buildings b ON b.id=r.building_id ORDER BY b.name, r.code').all();
    const buildings = db.prepare('SELECT * FROM buildings').all();
    res.json({ success: true, data: { rooms, buildings } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/admin/rooms', async (req: Request, res: Response) => {
  try {
    const { building_id, name, code, floor, capacity, room_type, is_accessible, department_id } = req.body;
    const id = `room-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`;
    db.prepare('INSERT INTO rooms (id, building_id, name, code, floor, capacity, room_type, is_accessible, department_id) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(id, building_id, name, code, floor || 1, capacity || 60, room_type || 'CLASSROOM', is_accessible ? 1 : 1, department_id || null);
    await writeThroughPg('INSERT INTO rooms (id, building_id, name, code, floor, capacity, room_type, is_accessible, department_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [id, building_id, name, code, floor || 1, capacity || 60, room_type || 'CLASSROOM', 1, department_id || null]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.put('/admin/rooms/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, floor, capacity, room_type, is_accessible, department_id, building_id } = req.body;
    db.prepare('UPDATE rooms SET name=?, code=?, floor=?, capacity=?, room_type=?, is_accessible=?, department_id=?, building_id=? WHERE id=?')
      .run(name, code, floor, capacity, room_type, is_accessible ? 1 : 0, department_id || null, building_id, id);
    await writeThroughPg('UPDATE rooms SET name=$1, code=$2, floor=$3, capacity=$4, room_type=$5, is_accessible=$6, department_id=$7, building_id=$8 WHERE id=$9',
      [name, code, floor, capacity, room_type, is_accessible ? 1 : 0, department_id || null, building_id, id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/admin/rooms/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM rooms WHERE id=?').run(id);
    await writeThroughPg('DELETE FROM rooms WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/admin/buildings', async (req: Request, res: Response) => {
  try {
    const { name, code, total_floors } = req.body;
    const campus = (db.prepare('SELECT id FROM campuses LIMIT 1').get() as any)?.id || 'camp-main';
    const id = `bld-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`;
    db.prepare('INSERT INTO buildings (id, campus_id, name, code, total_floors) VALUES (?,?,?,?,?)')
      .run(id, campus, name, code, total_floors || 3);
    await writeThroughPg('INSERT INTO buildings (id, campus_id, name, code, total_floors) VALUES ($1,$2,$3,$4,$5)',
      [id, campus, name, code, total_floors || 3]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/admin/buildings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM buildings WHERE id=?').run(id);
    await writeThroughPg('DELETE FROM buildings WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 18. SECTIONS + COHORTS CRUD (Year-aware)
// ============================================================
apiRouter.get('/admin/cohorts', (req: Request, res: Response) => {
  try {
    const sections = db.prepare(`
      SELECT s.*, b.name as batch_name, b.start_year, sem.semester_number, sem.name as semester_name,
             p.name as program_name, p.code as program_code, d.name as dept_name, d.code as dept_code
      FROM sections s
      LEFT JOIN batches b ON b.id = s.batch_id
      LEFT JOIN semesters sem ON sem.id = s.semester_id
      LEFT JOIN programs p ON p.id = b.program_id
      LEFT JOIN departments d ON d.id = p.department_id
      ORDER BY d.code, sem.semester_number, s.name
    `).all();
    const batches = db.prepare(`
      SELECT b.*, p.name as program_name, p.code as program_code, d.name as dept_name, d.code as dept_code
      FROM batches b
      LEFT JOIN programs p ON p.id = b.program_id
      LEFT JOIN departments d ON d.id = p.department_id
      ORDER BY b.start_year DESC
    `).all();
    const semesters = db.prepare(`
      SELECT sem.*, p.name as program_name, p.code as program_code
      FROM semesters sem LEFT JOIN programs p ON p.id = sem.program_id
      ORDER BY sem.semester_number
    `).all();
    const programs = db.prepare('SELECT * FROM programs').all();
    const departments = db.prepare('SELECT * FROM departments').all();
    res.json({ success: true, data: { sections, batches, semesters, programs, departments } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/admin/sections', async (req: Request, res: Response) => {
  try {
    const { name, batch_id, semester_id, student_count } = req.body;
    const id = `sec-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`;
    db.prepare('INSERT INTO sections (id, batch_id, semester_id, name, student_count) VALUES (?,?,?,?,?)')
      .run(id, batch_id, semester_id, name, student_count || 60);
    await writeThroughPg('INSERT INTO sections (id, batch_id, semester_id, name, student_count) VALUES ($1,$2,$3,$4,$5)',
      [id, batch_id, semester_id, name, student_count || 60]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.put('/admin/sections/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, student_count, batch_id, semester_id } = req.body;
    db.prepare('UPDATE sections SET name=?, student_count=?, batch_id=?, semester_id=? WHERE id=?')
      .run(name, student_count, batch_id, semester_id, id);
    await writeThroughPg('UPDATE sections SET name=$1, student_count=$2, batch_id=$3, semester_id=$4 WHERE id=$5',
      [name, student_count, batch_id, semester_id, id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/admin/sections/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM sections WHERE id=?').run(id);
    await writeThroughPg('DELETE FROM sections WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add new batch/year
apiRouter.post('/admin/batches', async (req: Request, res: Response) => {
  try {
    const { program_id, academic_year_id, name, start_year, total_students } = req.body;
    const id = `batch-${program_id.replace('prog-', '')}-${start_year}-${Date.now()}`;
    db.prepare('INSERT INTO batches (id, program_id, academic_year_id, name, start_year, total_students) VALUES (?,?,?,?,?,?)')
      .run(id, program_id, academic_year_id, name, start_year, total_students || 60);
    await writeThroughPg('INSERT INTO batches (id, program_id, academic_year_id, name, start_year, total_students) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, program_id, academic_year_id, name, start_year, total_students || 60]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add new semester for a program+year
apiRouter.post('/admin/semesters', async (req: Request, res: Response) => {
  try {
    const { academic_year_id, program_id, semester_number, name, is_odd } = req.body;
    const id = `sem-${program_id.replace('prog-', '')}-${semester_number}-${Date.now()}`;
    db.prepare('INSERT INTO semesters (id, academic_year_id, program_id, semester_number, name, is_odd) VALUES (?,?,?,?,?,?)')
      .run(id, academic_year_id, program_id, semester_number, name, is_odd ? 1 : 0);
    await writeThroughPg('INSERT INTO semesters (id, academic_year_id, program_id, semester_number, name, is_odd) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, academic_year_id, program_id, semester_number, name, is_odd ? 1 : 0]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Full hierarchy for year-based timetable navigation
apiRouter.get('/admin/hierarchy/full', (req: Request, res: Response) => {
  try {
    const sections = db.prepare(`
      SELECT s.id, s.name, s.student_count,
             b.start_year, b.id as batch_id,
             sem.semester_number,
             CASE WHEN sem.semester_number <= 2 THEN 1
                  WHEN sem.semester_number <= 4 THEN 2
                  WHEN sem.semester_number <= 6 THEN 3
                  ELSE 4 END as year_number,
             d.id as dept_id, d.name as dept_name, d.code as dept_code
      FROM sections s
      LEFT JOIN batches b ON b.id=s.batch_id
      LEFT JOIN semesters sem ON sem.id=s.semester_id
      LEFT JOIN programs p ON p.id=b.program_id
      LEFT JOIN departments d ON d.id=p.department_id
      ORDER BY d.code, year_number, s.name
    `).all();
    const academicYear = db.prepare('SELECT * FROM academic_years WHERE is_current=1 LIMIT 1').get();
    res.json({ success: true, data: { sections, academicYear } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
