import { FeasibilityReport } from '../../../shared/types';
import { TimetableProblemContext } from './types';

export class FeasibilityAnalyzer {
  public static analyze(context: TimetableProblemContext): FeasibilityReport {
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    const resourceBottlenecks: FeasibilityReport['resourceBottlenecks'] = [];
    const suggestions: string[] = [];

    const { activities, teachers, rooms, timeSlots, availability, relations } = context;

    // 1. Basic integrity checks
    if (activities.length === 0) {
      criticalIssues.push('No activities have been defined for scheduling.');
      suggestions.push('Create or import courses and activities before initiating generation.');
    }

    if (rooms.size === 0) {
      criticalIssues.push('No rooms are available in the university database.');
      suggestions.push('Add classrooms and laboratories to the university infrastructure.');
    }

    if (timeSlots.length === 0) {
      criticalIssues.push('No valid time slots exist in the academic timetable calendar.');
      suggestions.push('Define weekly working days and periods under Time Slot settings.');
    }

    // 2. Room Type Demand vs Capacity Supply
    const roomTypeSupply = new Map<string, number>();
    for (const room of rooms.values()) {
      const rType = room.roomType || (room as any).room_type || 'CLASSROOM';
      const currentSupply = roomTypeSupply.get(rType) || 0;
      // Total available weekly slot-hours for this room
      const unavailCount = availability.filter(
        a => a.entityType === 'ROOM' && a.entityId === room.id && a.state === 'UNAVAILABLE'
      ).length;
      const roomUsableSlots = Math.max(0, timeSlots.length - unavailCount);
      roomTypeSupply.set(rType, currentSupply + roomUsableSlots);
    }

    const roomTypeDemand = new Map<string, number>();
    for (const act of activities) {
      const neededHours = act.durationPeriods * act.occurrencesPerWeek;
      const currentDemand = roomTypeDemand.get(act.requiredRoomType) || 0;
      roomTypeDemand.set(act.requiredRoomType, currentDemand + neededHours);
    }

    for (const [rType, demand] of roomTypeDemand.entries()) {
      const supply = roomTypeSupply.get(rType) || 0;
      if (demand > supply) {
        criticalIssues.push(
          `Insufficient ${rType} capacity: Required ${demand} hours/week, but only ${supply} hours/week available across all matching rooms.`
        );
        resourceBottlenecks.push({
          resourceType: 'ROOM',
          name: `${rType} Infrastructure`,
          requiredHours: demand,
          availableHours: supply,
          deficit: demand - supply
        });
        suggestions.push(
          `Add more ${rType} facilities or extend daily working hours/periods to accommodate ${demand - supply} excess hours.`
        );
      } else if (demand > supply * 0.9) {
        warnings.push(
          `High ${rType} utilization (${Math.round((demand / supply) * 100)}%): Limited flexibility for soft preference optimization.`
        );
      }
    }

    // 3. Teacher Load vs Availability
    const teacherDemand = new Map<string, number>();
    for (const act of activities) {
      const neededHours = act.durationPeriods * act.occurrencesPerWeek;
      for (const tId of act.teacherIds) {
        teacherDemand.set(tId, (teacherDemand.get(tId) || 0) + neededHours);
      }
    }

    for (const [tId, demand] of teacherDemand.entries()) {
      const teacher = teachers.get(tId);
      const teacherName = teacher ? teacher.name : `Teacher ${tId}`;

      if (!teacher) {
        criticalIssues.push(`Activity assigned to unknown Teacher ID: ${tId}`);
        continue;
      }

      // Check max hours per week contract
      if (demand > teacher.maxHoursPerWeek) {
        criticalIssues.push(
          `Workload violation for ${teacherName}: Assigned ${demand} hours/week, which exceeds contractual max of ${teacher.maxHoursPerWeek} hours/week.`
        );
        resourceBottlenecks.push({
          resourceType: 'TEACHER',
          name: teacherName,
          requiredHours: demand,
          availableHours: teacher.maxHoursPerWeek,
          deficit: demand - teacher.maxHoursPerWeek
        });
        suggestions.push(`Reassign some courses of ${teacherName} to co-instructors or qualified colleagues.`);
      }

      // Check teacher unavailable slots
      const unavailCount = availability.filter(
        a => a.entityType === 'TEACHER' && a.entityId === tId && a.state === 'UNAVAILABLE'
      ).length;
      const usableSlots = timeSlots.length - unavailCount;
      if (demand > usableSlots) {
        criticalIssues.push(
          `Availability collision for ${teacherName}: Requires ${demand} hours, but only ${usableSlots} non-blocked time slots exist.`
        );
        suggestions.push(`Relax unavailable restrictions for ${teacherName} or reduce teaching load.`);
      }
    }

    // 4. Student Cohort Daily Overload Checks
    const studentDemand = new Map<string, number>();
    for (const act of activities) {
      const neededHours = act.durationPeriods * act.occurrencesPerWeek;
      const targets = [...act.sectionIds, ...act.groupIds, ...act.subgroupIds];
      for (const target of targets) {
        studentDemand.set(target, (studentDemand.get(target) || 0) + neededHours);
      }
    }

    for (const [targetId, demand] of studentDemand.entries()) {
      if (demand > timeSlots.length) {
        criticalIssues.push(
          `Student cohort overload: Group ${targetId} requires ${demand} hours/week, which exceeds the entire timetable capacity of ${timeSlots.length} periods.`
        );
        suggestions.push(`Check if overlapping activities are assigned to student cohort ${targetId}.`);
      }
    }

    // 5. Activity Relation Feasibility
    const distinctDaysCount = new Set(timeSlots.map(s => s.dayOfWeek)).size;
    for (const rel of relations) {
      if (rel.relationType === 'DIFFERENT_DAY') {
        const involvedCount = rel.activityIds.length;
        if (involvedCount > distinctDaysCount) {
          criticalIssues.push(
            `Contradictory Relation '${rel.name}': Requires ${involvedCount} activities on different days, but there are only ${distinctDaysCount} working days in the week.`
          );
          suggestions.push(`Modify '${rel.name}' or increase working days per week.`);
        }
      }
    }

    const isFeasible = criticalIssues.length === 0;

    return {
      isFeasible,
      criticalIssues,
      warnings,
      resourceBottlenecks,
      suggestions
    };
  }
}
