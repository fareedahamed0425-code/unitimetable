import { QualityScore } from '../../../shared/types';
import { ActivityAssignment, TimetableProblemContext } from './types';

export class QualityScorer {
  public static calculate(
    assignments: ActivityAssignment[],
    context: TimetableProblemContext
  ): QualityScore {
    const { activities, teachers, rooms, preferences, maxDays } = context;

    let hardViolationsCount = 0;
    let softViolationsCount = 0;
    let teacherIdleGapsCount = 0;
    let studentIdleGapsCount = 0;
    let roomChangesCount = 0;
    let buildingChangesCount = 0;

    const activityMap = new Map(activities.map(a => [a.id, a]));

    // 1. Verify Hard Constraints Satisfaction
    // Check overlapping assignments
    for (let i = 0; i < assignments.length; i++) {
      const a1 = assignments[i];
      const act1 = activityMap.get(a1.activityId);
      if (!act1) continue;

      for (let j = i + 1; j < assignments.length; j++) {
        const a2 = assignments[j];
        if (a1.dayOfWeek !== a2.dayOfWeek) continue;

        const act2 = activityMap.get(a2.activityId);
        if (!act2) continue;

        const overlap = Math.max(a1.periodIndex, a2.periodIndex) < 
                        Math.min(a1.periodIndex + a1.duration, a2.periodIndex + a2.duration);

        if (overlap) {
          // Room collision
          if (a1.roomId === a2.roomId) {
            hardViolationsCount++;
          }
          // Teacher collision
          for (const t of act1.teacherIds) {
            if (act2.teacherIds.includes(t)) {
              hardViolationsCount++;
            }
          }
          // Student collision
          const set1 = new Set([...act1.sectionIds, ...act1.groupIds, ...act1.subgroupIds]);
          for (const s of [...act2.sectionIds, ...act2.groupIds, ...act2.subgroupIds]) {
            if (set1.has(s)) {
              hardViolationsCount++;
            }
          }
        }
      }
    }

    // 2. Teacher Gaps & Workload Balance
    let totalTeacherScore = 0;
    let teacherCount = 0;

    for (const [tId, teacher] of teachers.entries()) {
      teacherCount++;
      const teacherActs = assignments.filter(a => {
        const act = activityMap.get(a.activityId);
        return act && act.teacherIds.includes(tId);
      });

      let teacherGaps = 0;
      const dailyHours: number[] = [];

      for (let day = 0; day < maxDays; day++) {
        const dayActs = teacherActs
          .filter(a => a.dayOfWeek === day)
          .sort((a, b) => a.periodIndex - b.periodIndex);

        let dayHours = 0;
        dayActs.forEach(a => dayHours += a.duration);
        dailyHours.push(dayHours);

        if (dayActs.length > 1) {
          for (let k = 0; k < dayActs.length - 1; k++) {
            const currentEnd = dayActs[k].periodIndex + dayActs[k].duration;
            const nextStart = dayActs[k + 1].periodIndex;
            if (nextStart > currentEnd) {
              const gap = nextStart - currentEnd;
              teacherGaps += gap;
              teacherIdleGapsCount += gap;
            }
          }
        }
      }

      // Teacher score (100 - penalties for gaps and unbalanced days)
      const gapPenalty = Math.min(40, teacherGaps * 8);
      const variance = dailyHours.reduce((acc, h) => acc + Math.pow(h - (teacherActs.length / maxDays), 2), 0) / maxDays;
      const balancePenalty = Math.min(20, variance * 5);

      const score = Math.max(20, 100 - gapPenalty - balancePenalty);
      totalTeacherScore += score;
    }
    const teacherSatisfaction = teacherCount > 0 ? Math.round(totalTeacherScore / teacherCount) : 100;

    // 3. Student Gaps & Daily Workload
    const sectionIds = Array.from(new Set(activities.flatMap(a => a.sectionIds)));
    let totalStudentScore = 0;

    for (const sId of sectionIds) {
      const secActs = assignments.filter(a => {
        const act = activityMap.get(a.activityId);
        return act && act.sectionIds.includes(sId);
      });

      let studentGaps = 0;
      let lateClassesCount = 0;

      for (let day = 0; day < maxDays; day++) {
        const dayActs = secActs
          .filter(a => a.dayOfWeek === day)
          .sort((a, b) => a.periodIndex - b.periodIndex);

        if (dayActs.length > 1) {
          for (let k = 0; k < dayActs.length - 1; k++) {
            const currentEnd = dayActs[k].periodIndex + dayActs[k].duration;
            const nextStart = dayActs[k + 1].periodIndex;
            if (nextStart > currentEnd) {
              const gap = nextStart - currentEnd;
              studentGaps += gap;
              studentIdleGapsCount += gap;
            }

            // Room / Building hopping
            const r1 = rooms.get(dayActs[k].roomId);
            const r2 = rooms.get(dayActs[k + 1].roomId);
            if (r1 && r2) {
              if (r1.id !== r2.id) roomChangesCount++;
              if (r1.buildingId !== r2.buildingId) buildingChangesCount++;
            }
          }
        }

        // Late classes check (period >= 6)
        dayActs.forEach(a => {
          if (a.periodIndex >= 6) lateClassesCount++;
        });
      }

      const sGapPenalty = Math.min(40, studentGaps * 10);
      const latePenalty = Math.min(25, lateClassesCount * 5);
      const studentScore = Math.max(20, 100 - sGapPenalty - latePenalty);
      totalStudentScore += studentScore;
    }
    const studentSatisfaction = sectionIds.length > 0 ? Math.round(totalStudentScore / sectionIds.length) : 100;

    // 4. Room Utilization & Occupancy Efficiency
    let totalCapOffered = 0;
    let totalCapUsed = 0;
    for (const a of assignments) {
      const act = activityMap.get(a.activityId);
      const rm = rooms.get(a.roomId);
      if (act && rm) {
        totalCapOffered += rm.capacity * a.duration;
        totalCapUsed += act.totalStudentCount * a.duration;
      }
    }
    const roomUtilization = totalCapOffered > 0 ? Math.min(100, Math.round((totalCapUsed / totalCapOffered) * 100)) : 80;

    // 5. Smart Preference Rules Satisfaction
    let prefScoreAccum = 0;
    let prefWeightTotal = 0;

    for (const pref of preferences) {
      if (!pref.isEnabled) continue;
      prefWeightTotal += pref.weight;

      if (pref.ruleCode === 'MINIMIZE_GAPS') {
        const gapRatio = Math.max(0, 100 - (studentIdleGapsCount + teacherIdleGapsCount) * 5);
        prefScoreAccum += gapRatio * (pref.weight / 100);
      } else if (pref.ruleCode === 'PREFER_AFTERNOON_LABS') {
        const labActs = assignments.filter(a => {
          const act = activityMap.get(a.activityId);
          return act && act.activityType === 'LABORATORY';
        });
        const afternoonLabs = labActs.filter(a => a.periodIndex >= 4).length;
        const ratio = labActs.length > 0 ? Math.round((afternoonLabs / labActs.length) * 100) : 100;
        prefScoreAccum += ratio * (pref.weight / 100);
      } else if (pref.ruleCode === 'AVOID_LATE_CLASSES') {
        const lateActs = assignments.filter(a => a.periodIndex >= 6).length;
        const penalty = Math.max(0, 100 - lateActs * 10);
        prefScoreAccum += penalty * (pref.weight / 100);
      } else {
        prefScoreAccum += 90 * (pref.weight / 100);
      }
    }

    const preferenceScore = prefWeightTotal > 0 ? Math.min(100, Math.round((prefScoreAccum / prefWeightTotal) * 100)) : 90;
    const gapScore = Math.max(20, 100 - (studentIdleGapsCount + teacherIdleGapsCount) * 4);
    const workloadBalance = Math.round((teacherSatisfaction + studentSatisfaction) / 2);

    const hardConstraintSatisfaction = hardViolationsCount === 0 && assignments.length === activities.length ? 100 : Math.max(0, 100 - hardViolationsCount * 25);
    const softConstraintSatisfaction = Math.round(
      teacherSatisfaction * 0.25 + 
      studentSatisfaction * 0.25 + 
      preferenceScore * 0.25 + 
      gapScore * 0.15 + 
      roomUtilization * 0.10
    );

    const overallScore = hardConstraintSatisfaction === 100 ? softConstraintSatisfaction : Math.round(hardConstraintSatisfaction * 0.5);

    return {
      overallScore,
      hardConstraintSatisfaction,
      softConstraintSatisfaction,
      teacherSatisfaction,
      studentSatisfaction,
      roomUtilization,
      gapScore,
      workloadBalance,
      preferenceScore,
      metrics: {
        totalActivitiesToSchedule: activities.length,
        scheduledActivities: assignments.length,
        unallocatedActivities: Math.max(0, activities.length - assignments.length),
        hardViolationsCount,
        softViolationsCount,
        teacherIdleGapsCount,
        studentIdleGapsCount,
        roomChangesCount,
        buildingChangesCount
      }
    };
  }
}
