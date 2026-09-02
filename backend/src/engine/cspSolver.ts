import {
  Activity,
  ActivityRelation,
  EntityAvailability,
  Room,
  Teacher,
  TimeSlot
} from '../../../shared/types';
import { ActivityAssignment, ScheduleSlot, TimetableProblemContext } from './types';

export class CSPSolver {
  private context: TimetableProblemContext;
  private activities: Activity[];
  private teachers: Map<string, Teacher>;
  private rooms: Map<string, Room>;
  private timeSlots: TimeSlot[];
  private availability: EntityAvailability[];
  private relations: ActivityRelation[];
  private slotsByDay: Map<number, TimeSlot[]>;
  private maxDays: number;
  private unavailSet: Set<string>; // key: `${entityType}_${entityId}_${day}_${period}`

  constructor(context: TimetableProblemContext) {
    this.context = context;
    this.activities = [...context.activities];
    this.teachers = context.teachers;
    this.rooms = context.rooms;
    this.timeSlots = context.timeSlots;
    this.availability = context.availability;
    this.relations = context.relations;
    this.maxDays = context.maxDays;

    // Group time slots by day
    this.slotsByDay = new Map();
    for (const slot of this.timeSlots) {
      if (!this.slotsByDay.has(slot.dayOfWeek)) {
        this.slotsByDay.set(slot.dayOfWeek, []);
      }
      this.slotsByDay.get(slot.dayOfWeek)!.push(slot);
    }
    for (const [day, list] of this.slotsByDay.entries()) {
      list.sort((a, b) => a.periodIndex - b.periodIndex);
    }

    // Build fast lookup set for unavailable states
    this.unavailSet = new Set();
    for (const av of this.availability) {
      if (av.state === 'UNAVAILABLE') {
        this.unavailSet.add(`${av.entityType}_${av.entityId}_${av.dayOfWeek}_${av.periodIndex}`);
      }
    }
  }

  public solve(onProgress?: (percent: number, message: string) => void): ActivityAssignment[] | null {
    // 1. Separate locked activities vs unlocked activities
    const lockedAssignments: ActivityAssignment[] = [];
    const activitiesToSchedule: Activity[] = [];

    for (const act of this.activities) {
      if (act.isLocked && act.lockedDay !== undefined && act.lockedPeriod !== undefined && act.lockedRoomId) {
        lockedAssignments.push({
          activityId: act.id,
          dayOfWeek: act.lockedDay,
          periodIndex: act.lockedPeriod,
          duration: act.durationPeriods,
          roomId: act.lockedRoomId,
          isLocked: true
        });
      } else {
        activitiesToSchedule.push(act);
      }
    }

    // 2. Pre-calculate domains for every unlocked activity
    const initialDomains = new Map<string, ScheduleSlot[]>();
    for (const act of activitiesToSchedule) {
      const validSlots = this.computeDomainForActivity(act);
      if (validSlots.length === 0) {
        // Activity cannot even fit anywhere in isolation
        return null;
      }
      initialDomains.set(act.id, validSlots);
    }

    // 3. Current assignments map (starts with locked assignments)
    const currentAssignments = new Map<string, ActivityAssignment>();
    for (const locked of lockedAssignments) {
      currentAssignments.set(locked.activityId, locked);
    }

    // 4. Backtracking search with MRV heuristic and forward checking
    const sortedActivities = this.sortVariablesByMRVAndDegree(activitiesToSchedule, initialDomains);

    const success = this.backtrack(
      0,
      sortedActivities,
      initialDomains,
      currentAssignments,
      onProgress
    );

    if (success) {
      return Array.from(currentAssignments.values());
    }

    return null;
  }

  private computeDomainForActivity(act: Activity): ScheduleSlot[] {
    const validSlots: ScheduleSlot[] = [];
    const candidateRooms: Room[] = [];

    // Filter suitable rooms
    for (const room of this.rooms.values()) {
      const rType = room.roomType || (room as any).room_type;
      // Check room type compatibility
      if (act.requiredRoomType && rType !== act.requiredRoomType) {
        continue;
      }
      // Check capacity
      if (room.capacity < act.totalStudentCount) {
        continue;
      }
      candidateRooms.push(room);
    }

    if (candidateRooms.length === 0) {
      return [];
    }

    // Check all day and period combinations
    for (const [day, daySlots] of this.slotsByDay.entries()) {
      for (let i = 0; i <= daySlots.length - act.durationPeriods; i++) {
        const startSlot = daySlots[i];
        
        // Verify continuous slots without breaks
        let isContinuous = true;
        for (let d = 0; d < act.durationPeriods; d++) {
          const currentSlot = daySlots[i + d];
          if (currentSlot.periodIndex !== startSlot.periodIndex + d || currentSlot.isBreak) {
            isContinuous = false;
            break;
          }

          // Check Teacher Availability
          for (const tId of act.teacherIds) {
            if (this.unavailSet.has(`TEACHER_${tId}_${day}_${currentSlot.periodIndex}`)) {
              isContinuous = false;
              break;
            }
          }
          if (!isContinuous) break;

          // Check Student Availability
          const studentTargets = [...act.sectionIds, ...act.groupIds, ...act.subgroupIds];
          for (const sId of studentTargets) {
            if (this.unavailSet.has(`STUDENT_SECTION_${sId}_${day}_${currentSlot.periodIndex}`) ||
                this.unavailSet.has(`STUDENT_GROUP_${sId}_${day}_${currentSlot.periodIndex}`)) {
              isContinuous = false;
              break;
            }
          }
          if (!isContinuous) break;
        }

        if (!isContinuous) continue;

        // Add valid rooms for this slot
        for (const room of candidateRooms) {
          let roomAvailable = true;
          for (let d = 0; d < act.durationPeriods; d++) {
            const pIdx = startSlot.periodIndex + d;
            if (this.unavailSet.has(`ROOM_${room.id}_${day}_${pIdx}`)) {
              roomAvailable = false;
              break;
            }
          }

          if (roomAvailable) {
            validSlots.push({
              dayOfWeek: day,
              periodIndex: startSlot.periodIndex,
              roomId: room.id
            });
          }
        }
      }
    }

    return validSlots;
  }

  private sortVariablesByMRVAndDegree(
    activities: Activity[],
    domains: Map<string, ScheduleSlot[]>
  ): Activity[] {
    return [...activities].sort((a, b) => {
      const domainA = (domains.get(a.id) || []).length;
      const domainB = (domains.get(b.id) || []).length;

      // 1. Minimum Remaining Values (MRV)
      if (domainA !== domainB) {
        return domainA - domainB;
      }

      // 2. Degree Heuristic: Activities with longer duration or larger student counts first
      if (b.durationPeriods !== a.durationPeriods) {
        return b.durationPeriods - a.durationPeriods;
      }

      return b.totalStudentCount - a.totalStudentCount;
    });
  }

  private backtrack(
    index: number,
    activities: Activity[],
    domains: Map<string, ScheduleSlot[]>,
    assignments: Map<string, ActivityAssignment>,
    onProgress?: (percent: number, message: string) => void
  ): boolean {
    if (index >= activities.length) {
      // All activities placed without any hard constraint violation!
      return true;
    }

    const currentActivity = activities[index];
    const candidateSlots = domains.get(currentActivity.id) || [];

    // Order candidate values (heuristics: prefer morning/afternoon match and room affinity)
    const orderedSlots = this.orderCandidateValues(currentActivity, candidateSlots);

    if (onProgress && index % 3 === 0) {
      const pct = Math.min(85, Math.round((index / activities.length) * 85));
      onProgress(pct, `Placing activity ${index + 1}/${activities.length}: ${currentActivity.name}`);
    }

    for (const slot of orderedSlots) {
      if (this.isConsistent(currentActivity, slot, assignments)) {
        // Place assignment
        const newAssignment: ActivityAssignment = {
          activityId: currentActivity.id,
          dayOfWeek: slot.dayOfWeek,
          periodIndex: slot.periodIndex,
          duration: currentActivity.durationPeriods,
          roomId: slot.roomId,
          isLocked: false
        };
        assignments.set(currentActivity.id, newAssignment);

        // Recurse to next variable
        const success = this.backtrack(
          index + 1,
          activities,
          domains,
          assignments,
          onProgress
        );

        if (success) {
          return true;
        }

        // Backtrack
        assignments.delete(currentActivity.id);
      }
    }

    return false;
  }

  private orderCandidateValues(activity: Activity, slots: ScheduleSlot[]): ScheduleSlot[] {
    // Prefer slots matching preferred day/room or sensible morning/afternoon distribution
    return [...slots].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (activity.preferredDayOfWeek !== undefined) {
        if (a.dayOfWeek === activity.preferredDayOfWeek) scoreA += 10;
        if (b.dayOfWeek === activity.preferredDayOfWeek) scoreB += 10;
      }

      if (activity.preferredRoomId) {
        if (a.roomId === activity.preferredRoomId) scoreA += 10;
        if (b.roomId === activity.preferredRoomId) scoreB += 10;
      }

      // Labs prefer afternoon slots (periodIndex >= 4)
      if (activity.activityType === 'LABORATORY') {
        if (a.periodIndex >= 4) scoreA += 5;
        if (b.periodIndex >= 4) scoreB += 5;
      }

      return scoreB - scoreA;
    });
  }

  public isConsistent(
    activity: Activity,
    slot: ScheduleSlot,
    assignments: Map<string, ActivityAssignment>
  ): boolean {
    const actDuration = activity.durationPeriods;
    const actStart = slot.periodIndex;
    const actEnd = actStart + actDuration;
    const actDay = slot.dayOfWeek;
    const actRoom = slot.roomId;

    const actStudentTargets = new Set([
      ...activity.sectionIds,
      ...activity.groupIds,
      ...activity.subgroupIds
    ]);

    for (const assigned of assignments.values()) {
      // Only compare if on the same day
      if (assigned.dayOfWeek !== actDay) {
        continue;
      }

      const otherStart = assigned.periodIndex;
      const otherEnd = otherStart + assigned.duration;

      // Check time overlap: [actStart, actEnd) overlaps with [otherStart, otherEnd)
      const timesOverlap = Math.max(actStart, otherStart) < Math.min(actEnd, otherEnd);

      if (timesOverlap) {
        // 1. Room collision (Hard Constraint)
        if (assigned.roomId === actRoom) {
          return false;
        }

        const otherAct = this.activities.find(a => a.id === assigned.activityId);
        if (otherAct) {
          // 2. Teacher collision (Hard Constraint: no teacher in 2 places at once)
          for (const tId of activity.teacherIds) {
            if (otherAct.teacherIds.includes(tId)) {
              return false;
            }
          }

          // 3. Student cohort collision (Hard Constraint: section/group cannot attend 2 classes at once)
          for (const sId of otherAct.sectionIds) {
            if (actStudentTargets.has(sId)) return false;
            // Check if activity has groups belonging to this section
            if (activity.groupIds.some(g => g.includes(sId.replace('sec-', '')))) return false;
          }
          for (const gId of otherAct.groupIds) {
            if (actStudentTargets.has(gId)) return false;
            // Check if activity is the parent section of this group
            if (activity.sectionIds.some(s => gId.includes(s.replace('sec-', '')))) return false;
          }
          for (const sgId of otherAct.subgroupIds) {
            if (actStudentTargets.has(sgId)) return false;
          }
        }
      }
    }

    // 4. Validate Activity Relations (Same Day, Different Day, Ordered, Same Room)
    for (const rel of this.relations) {
      if (!rel.isHardConstraint) continue;
      if (!rel.activityIds.includes(activity.id)) continue;

      for (const otherId of rel.activityIds) {
        if (otherId === activity.id) continue;
        const otherAssigned = assignments.get(otherId);
        if (!otherAssigned) continue;

        if (rel.relationType === 'DIFFERENT_DAY') {
          if (otherAssigned.dayOfWeek === actDay) {
            return false;
          }
        } else if (rel.relationType === 'SAME_DAY') {
          if (otherAssigned.dayOfWeek !== actDay) {
            return false;
          }
        } else if (rel.relationType === 'SAME_STARTING_TIME') {
          if (otherAssigned.dayOfWeek !== actDay || otherAssigned.periodIndex !== actStart) {
            return false;
          }
        } else if (rel.relationType === 'SAME_ROOM') {
          if (otherAssigned.roomId !== actRoom) {
            return false;
          }
        } else if (rel.relationType === 'ORDERED') {
          // Verify sequence in activityIds array
          const myIdx = rel.activityIds.indexOf(activity.id);
          const otherIdx = rel.activityIds.indexOf(otherId);
          if (myIdx > otherIdx) {
            // Must happen after other
            if (actDay < otherAssigned.dayOfWeek || (actDay === otherAssigned.dayOfWeek && actStart <= otherAssigned.periodIndex)) {
              return false;
            }
          }
        }
      }
    }

    // 5. Teacher consecutive hours limit
    for (const tId of activity.teacherIds) {
      const teacher = this.teachers.get(tId);
      if (teacher && teacher.maxConsecutiveHours) {
        // Count continuous hours including this new activity
        let continuousHours = actDuration;
        // Check backwards
        let checkPeriod = actStart - 1;
        while (checkPeriod >= 0) {
          const prev = Array.from(assignments.values()).find(
            a => a.dayOfWeek === actDay && 
                 a.periodIndex + a.duration === checkPeriod + 1 &&
                 this.activities.find(act => act.id === a.activityId)?.teacherIds.includes(tId)
          );
          if (prev) {
            continuousHours += prev.duration;
            checkPeriod = prev.periodIndex - 1;
          } else {
            break;
          }
        }
        if (continuousHours > teacher.maxConsecutiveHours) {
          return false;
        }
      }
    }

    return true;
  }
}
