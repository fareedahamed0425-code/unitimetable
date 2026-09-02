import { CSPSolver } from '../engine/cspSolver';
import { FeasibilityAnalyzer } from '../engine/feasibilityAnalyzer';
import { db } from '../db/database';
import { Activity, ActivityRelation, EntityAvailability, Room, Teacher, TimeSlot } from '../../../shared/types';
import { TimetableProblemContext } from '../engine/types';

function buildProblemContext(): TimetableProblemContext {
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
    preferences: [],
    maxDays,
    maxPeriodsPerDay
  };
}

const ctx = buildProblemContext();
console.log('Activities count:', ctx.activities.length);

const solver = new CSPSolver(ctx);
for (const act of ctx.activities) {
  const domain = (solver as any).computeDomainForActivity(act);
  console.log(`Activity ${act.code} (${act.activityType}, dur ${act.durationPeriods}): domain size = ${domain.length}`);
}

const solution = solver.solve((pct, msg) => console.log(`Progress: ${pct}% - ${msg}`));
console.log('Solution:', solution ? `SUCCESS (${solution.length} activities)` : 'FAILED');
