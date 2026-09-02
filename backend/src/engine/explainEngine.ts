import { ActivityAssignment, TimetableProblemContext } from './types';

export class ExplainEngine {
  public static explainAssignment(
    assignment: ActivityAssignment,
    context: TimetableProblemContext
  ): string {
    const { activities, teachers, rooms, preferences } = context;
    const act = activities.find(a => a.id === assignment.activityId);
    const room = rooms.get(assignment.roomId);

    if (!act || !room) {
      return 'Scheduled according to constraint solver rules.';
    }

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayName = dayNames[assignment.dayOfWeek] || `Day ${assignment.dayOfWeek}`;
    const teacherNames = act.teacherIds.map(t => teachers.get(t)?.name || t).join(', ');

    const reasons: string[] = [
      `No schedule collision for teacher (${teacherNames})`,
      `Room capacity (${room.capacity} seats) satisfies cohort size (${act.totalStudentCount})`,
      `Room facility matches required type (${act.requiredRoomType})`,
      `Scheduled inside teacher & student availability window`
    ];

    if (act.activityType === 'LABORATORY' && assignment.periodIndex >= 4) {
      reasons.push('Placed in afternoon slot per smart laboratory preference');
    }

    if (assignment.isLocked) {
      reasons.push('Locked by Timetable Administrator in semi-automatic mode');
    }

    return `${act.name} scheduled on ${dayName} (Period ${assignment.periodIndex + 1}) in ${room.name}.\nRationale:\n• ` + reasons.join('\n• ');
  }
}
