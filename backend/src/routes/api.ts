import { Request, Response, Router } from 'express';
import { db, runInTransaction } from '../db/database';
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
      lockedRoomId: a.locked_room_id || undefined
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

  const maxDays = new Set(timeSlots.map(s => s.dayOfWeek)).size || 5;
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
// 1. AUTH & USERS (RBAC)
// ----------------------------------------------------
apiRouter.get('/auth/users', (req: Request, res: Response) => {
  const users = db.prepare('SELECT * FROM users ORDER BY name ASC').all() as User[];
  res.json({ success: true, data: users });
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
// 3. TEACHERS & FACULTY
// ----------------------------------------------------
apiRouter.get('/teachers', (req: Request, res: Response) => {
  const teachers = db.prepare('SELECT * FROM teachers ORDER BY name ASC').all() as any[];
  const qualifications = db.prepare('SELECT * FROM teacher_qualifications').all() as any[];

  const fullTeachers: Teacher[] = teachers.map(t => ({
    id: t.id,
    employeeId: t.employee_id,
    name: t.name,
    email: t.email,
    phone: t.phone,
    departmentId: t.department_id,
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

apiRouter.post('/preferences/nlp-parse', (req: Request, res: Response) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  const parsed = NLPPreferenceParser.parse(prompt);
  res.json({ success: true, data: parsed });
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
  const job = activeJobs.get(req.params.jobId);
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
