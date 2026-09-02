import { TimetableConflict } from '../../../shared/types';
import { ActivityAssignment, TimetableProblemContext } from './types';

export class ConflictEngine {
  public static detectConflicts(
    assignments: ActivityAssignment[],
    context: TimetableProblemContext
  ): TimetableConflict[] {
    const conflicts: TimetableConflict[] = [];
    const { activities, teachers, rooms, availability, relations } = context;
    const activityMap = new Map(activities.map(a => [a.id, a]));

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // 1. Check pairwise collisions (Room, Teacher, Student Cohort)
    for (let i = 0; i < assignments.length; i++) {
      const a1 = assignments[i];
      const act1 = activityMap.get(a1.activityId);
      if (!act1) continue;

      const a1Start = a1.periodIndex;
      const a1End = a1Start + a1.duration;

      for (let j = i + 1; j < assignments.length; j++) {
        const a2 = assignments[j];
        if (a1.dayOfWeek !== a2.dayOfWeek) continue;

        const act2 = activityMap.get(a2.activityId);
        if (!act2) continue;

        const a2Start = a2.periodIndex;
        const a2End = a2Start + a2.duration;

        const isOverlapping = Math.max(a1Start, a2Start) < Math.min(a1End, a2End);
        if (!isOverlapping) continue;

        const dayName = dayNames[a1.dayOfWeek] || `Day ${a1.dayOfWeek}`;

        // A. Room Collision
        if (a1.roomId === a2.roomId) {
          const room = rooms.get(a1.roomId);
          const roomName = room ? room.name : a1.roomId;
          conflicts.push({
            id: `conf-room-${a1.activityId}-${a2.activityId}`,
            severity: 'CRITICAL',
            conflictType: 'ROOM_COLLISION',
            title: `Room Collision in ${roomName}`,
            description: `'${act1.name}' and '${act2.name}' are both scheduled in ${roomName} simultaneously on ${dayName} during overlapping periods.`,
            affectedActivityIds: [a1.activityId, a2.activityId],
            affectedTeacherIds: [...act1.teacherIds, ...act2.teacherIds],
            affectedStudentGroupIds: [...act1.sectionIds, ...act2.sectionIds],
            affectedRoomIds: [a1.roomId],
            dayOfWeek: a1.dayOfWeek,
            periodIndex: a1.periodIndex,
            violatedConstraintRule: 'Hard Constraint: Single Room Exclusivity',
            suggestedFix: `Move '${act2.name}' to another available room or a different time slot.`
          });
        }

        // B. Teacher Collision
        for (const tId of act1.teacherIds) {
          if (act2.teacherIds.includes(tId)) {
            const teacher = teachers.get(tId);
            const teacherName = teacher ? teacher.name : tId;
            conflicts.push({
              id: `conf-teach-${tId}-${a1.activityId}-${a2.activityId}`,
              severity: 'CRITICAL',
              conflictType: 'TEACHER_COLLISION',
              title: `Teacher Collision: ${teacherName}`,
              description: `${teacherName} is double-booked for '${act1.name}' and '${act2.name}' on ${dayName} during overlapping periods.`,
              affectedActivityIds: [a1.activityId, a2.activityId],
              affectedTeacherIds: [tId],
              affectedStudentGroupIds: [...act1.sectionIds, ...act2.sectionIds],
              affectedRoomIds: [a1.roomId, a2.roomId],
              dayOfWeek: a1.dayOfWeek,
              periodIndex: a1.periodIndex,
              violatedConstraintRule: 'Hard Constraint: Teacher Non-Simultaneity',
              suggestedFix: `Reschedule one of the classes to a different period when ${teacherName} is free.`
            });
          }
        }

        // C. Student Cohort Collision
        const set1 = new Set([...act1.sectionIds, ...act1.groupIds, ...act1.subgroupIds]);
        for (const sId of [...act2.sectionIds, ...act2.groupIds, ...act2.subgroupIds]) {
          if (set1.has(sId)) {
            conflicts.push({
              id: `conf-stud-${sId}-${a1.activityId}-${a2.activityId}`,
              severity: 'CRITICAL',
              conflictType: 'STUDENT_COLLISION',
              title: `Student Group Overlap: ${sId}`,
              description: `Student cohort ${sId} is scheduled for two simultaneous classes ('${act1.name}' and '${act2.name}') on ${dayName}.`,
              affectedActivityIds: [a1.activityId, a2.activityId],
              affectedTeacherIds: [...act1.teacherIds, ...act2.teacherIds],
              affectedStudentGroupIds: [sId],
              affectedRoomIds: [a1.roomId, a2.roomId],
              dayOfWeek: a1.dayOfWeek,
              periodIndex: a1.periodIndex,
              violatedConstraintRule: 'Hard Constraint: Student Cohort Non-Simultaneity',
              suggestedFix: `Shift '${act2.name}' to a free period for cohort ${sId}.`
            });
            break;
          }
        }
      }

      // 2. Room Capacity & Room Type Violations
      const room = rooms.get(a1.roomId);
      if (room) {
        if (room.capacity < act1.totalStudentCount) {
          conflicts.push({
            id: `conf-cap-${a1.activityId}`,
            severity: 'CRITICAL',
            conflictType: 'CAPACITY_VIOLATION',
            title: `Insufficient Room Capacity in ${room.name}`,
            description: `'${act1.name}' has ${act1.totalStudentCount} students, but ${room.name} only holds ${room.capacity} seats.`,
            affectedActivityIds: [a1.activityId],
            affectedTeacherIds: act1.teacherIds,
            affectedStudentGroupIds: act1.sectionIds,
            affectedRoomIds: [room.id],
            dayOfWeek: a1.dayOfWeek,
            periodIndex: a1.periodIndex,
            violatedConstraintRule: 'Hard Constraint: Room Capacity >= Student Count',
            suggestedFix: `Move to a larger lecture hall or split into smaller laboratory batches.`
          });
        }

        if (act1.requiredRoomType && room.roomType !== act1.requiredRoomType) {
          conflicts.push({
            id: `conf-rtype-${a1.activityId}`,
            severity: 'MAJOR',
            conflictType: 'EQUIPMENT_VIOLATION',
            title: `Room Type Incompatibility: ${room.name}`,
            description: `'${act1.name}' requires a ${act1.requiredRoomType}, but ${room.name} is configured as a ${room.roomType}.`,
            affectedActivityIds: [a1.activityId],
            affectedTeacherIds: act1.teacherIds,
            affectedStudentGroupIds: act1.sectionIds,
            affectedRoomIds: [room.id],
            dayOfWeek: a1.dayOfWeek,
            periodIndex: a1.periodIndex,
            violatedConstraintRule: 'Hard Constraint: Required Room Facility Matching',
            suggestedFix: `Reassign to a dedicated ${act1.requiredRoomType}.`
          });
        }
      }

      // 3. Availability Restrictions Violation
      for (let d = 0; d < a1.duration; d++) {
        const pIdx = a1.periodIndex + d;
        const dayName = dayNames[a1.dayOfWeek] || `Day ${a1.dayOfWeek}`;

        // Check Teacher Availability
        for (const tId of act1.teacherIds) {
          const isUnavail = availability.some(
            av => av.entityType === 'TEACHER' && av.entityId === tId && av.dayOfWeek === a1.dayOfWeek && av.periodIndex === pIdx && av.state === 'UNAVAILABLE'
          );
          if (isUnavail) {
            const t = teachers.get(tId);
            conflicts.push({
              id: `conf-tavail-${tId}-${a1.activityId}-${pIdx}`,
              severity: 'CRITICAL',
              conflictType: 'AVAILABILITY_VIOLATION',
              title: `Teacher Availability Violation: ${t ? t.name : tId}`,
              description: `${t ? t.name : tId} is marked UNAVAILABLE on ${dayName} period ${pIdx + 1}, but '${act1.name}' is placed here.`,
              affectedActivityIds: [a1.activityId],
              affectedTeacherIds: [tId],
              affectedStudentGroupIds: act1.sectionIds,
              affectedRoomIds: [a1.roomId],
              dayOfWeek: a1.dayOfWeek,
              periodIndex: pIdx,
              violatedConstraintRule: 'Hard Constraint: Entity Availability Window',
              suggestedFix: `Relocate class to a slot where ${t ? t.name : tId} is available.`
            });
          }
        }

        // Check Room Availability
        const isRoomUnavail = availability.some(
          av => av.entityType === 'ROOM' && av.entityId === a1.roomId && av.dayOfWeek === a1.dayOfWeek && av.periodIndex === pIdx && av.state === 'UNAVAILABLE'
        );
        if (isRoomUnavail) {
          conflicts.push({
            id: `conf-ravail-${a1.roomId}-${a1.activityId}-${pIdx}`,
            severity: 'CRITICAL',
            conflictType: 'AVAILABILITY_VIOLATION',
            title: `Room Unavailable: ${room ? room.name : a1.roomId}`,
            description: `${room ? room.name : a1.roomId} is locked or under maintenance on ${dayName} period ${pIdx + 1}.`,
            affectedActivityIds: [a1.activityId],
            affectedTeacherIds: act1.teacherIds,
            affectedStudentGroupIds: act1.sectionIds,
            affectedRoomIds: [a1.roomId],
            dayOfWeek: a1.dayOfWeek,
            periodIndex: pIdx,
            violatedConstraintRule: 'Hard Constraint: Room Availability Window',
            suggestedFix: `Select an alternative room.`
          });
        }
      }
    }

    // 4. Check Activity Relations (DIFFERENT_DAY, SAME_DAY, etc.)
    for (const rel of relations) {
      if (rel.relationType === 'DIFFERENT_DAY') {
        const assignedDays = new Set<number>();
        for (const actId of rel.activityIds) {
          const ass = assignments.find(a => a.activityId === actId);
          if (ass) {
            if (assignedDays.has(ass.dayOfWeek)) {
              conflicts.push({
                id: `conf-rel-${rel.id}-${ass.dayOfWeek}`,
                severity: rel.isHardConstraint ? 'CRITICAL' : 'MAJOR',
                conflictType: 'RELATION_VIOLATION',
                title: `Relation Violation: ${rel.name}`,
                description: `Activities in relation '${rel.name}' were scheduled on the same day (${dayNames[ass.dayOfWeek]}), violating the DIFFERENT_DAY rule.`,
                affectedActivityIds: rel.activityIds,
                affectedTeacherIds: [],
                affectedStudentGroupIds: [],
                affectedRoomIds: [],
                dayOfWeek: ass.dayOfWeek,
                periodIndex: ass.periodIndex,
                violatedConstraintRule: `Activity Relation: ${rel.name}`,
                suggestedFix: `Distribute activities across separate days of the week.`
              });
              break;
            }
            assignedDays.add(ass.dayOfWeek);
          }
        }
      }
    }

    return conflicts;
  }
}
