import { CSPSolver } from './cspSolver';
import { QualityScorer } from './qualityScorer';
import { ActivityAssignment, TimetableProblemContext } from './types';

export class TimetableOptimizer {
  public static optimize(
    initialAssignments: ActivityAssignment[],
    context: TimetableProblemContext,
    onProgress?: (percent: number, message: string, currentScore: number) => void
  ): ActivityAssignment[] {
    const solver = new CSPSolver(context);
    let currentSolution = initialAssignments.map(a => ({ ...a }));
    let currentScore = QualityScorer.calculate(currentSolution, context).overallScore;
    let bestSolution = currentSolution.map(a => ({ ...a }));
    let bestScore = currentScore;

    const maxIterations = 250;
    let temperature = 1.0;
    const coolingRate = 0.98;

    const unlockedIndices = currentSolution
      .map((a, idx) => (!a.isLocked ? idx : -1))
      .filter(idx => idx !== -1);

    if (unlockedIndices.length === 0) {
      return bestSolution;
    }

    const { activities, rooms, timeSlots } = context;
    const activityMap = new Map(activities.map(a => [a.id, a]));
    const candidateRooms = Array.from(rooms.values());

    for (let iter = 0; iter < maxIterations; iter++) {
      temperature *= coolingRate;

      if (onProgress && iter % 25 === 0) {
        const pct = 85 + Math.round((iter / maxIterations) * 15);
        onProgress(pct, `Optimizing soft preferences (Iteration ${iter + 1}/${maxIterations})...`, Math.round(bestScore));
      }

      // Pick a random unlocked activity to perturb
      const randIdx = unlockedIndices[Math.floor(Math.random() * unlockedIndices.length)];
      const targetAssignment = currentSolution[randIdx];
      const targetActivity = activityMap.get(targetAssignment.activityId);
      if (!targetActivity) continue;

      // Strategy A: Try swapping with another compatible activity
      // Strategy B: Try moving to an alternative slot/room
      const strategy = Math.random();

      if (strategy < 0.5) {
        // Strategy A: Perturb slot or room
        const randSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
        const validRooms = candidateRooms.filter(
          r => r.roomType === targetActivity.requiredRoomType && r.capacity >= targetActivity.totalStudentCount
        );
        if (validRooms.length === 0) continue;
        const randRoom = validRooms[Math.floor(Math.random() * validRooms.length)];

        // Test candidate move
        const candidateAssignment: ActivityAssignment = {
          ...targetAssignment,
          dayOfWeek: randSlot.dayOfWeek,
          periodIndex: randSlot.periodIndex,
          roomId: randRoom.id
        };

        // Create temporary map excluding target
        const tempAssignments = new Map<string, ActivityAssignment>();
        currentSolution.forEach((a, i) => {
          if (i !== randIdx) tempAssignments.set(a.activityId, a);
        });

        if (solver.isConsistent(targetActivity, { dayOfWeek: candidateAssignment.dayOfWeek, periodIndex: candidateAssignment.periodIndex, roomId: candidateAssignment.roomId }, tempAssignments)) {
          tempAssignments.set(targetActivity.id, candidateAssignment);
          const newScore = QualityScorer.calculate(Array.from(tempAssignments.values()), context).overallScore;
          const delta = newScore - currentScore;

          if (delta > 0 || Math.exp(delta / (temperature * 10)) > Math.random()) {
            currentSolution[randIdx] = candidateAssignment;
            currentScore = newScore;

            if (currentScore > bestScore) {
              bestScore = currentScore;
              bestSolution = currentSolution.map(a => ({ ...a }));
            }
          }
        }
      } else {
        // Strategy B: Swap two activities if durations match
        const otherRandIdx = unlockedIndices[Math.floor(Math.random() * unlockedIndices.length)];
        if (otherRandIdx === randIdx) continue;

        const a1 = currentSolution[randIdx];
        const a2 = currentSolution[otherRandIdx];
        const act1 = activityMap.get(a1.activityId);
        const act2 = activityMap.get(a2.activityId);

        if (act1 && act2 && act1.durationPeriods === act2.durationPeriods) {
          const tempAssignments = new Map<string, ActivityAssignment>();
          currentSolution.forEach((a, i) => {
            if (i !== randIdx && i !== otherRandIdx) tempAssignments.set(a.activityId, a);
          });

          // Test swap
          const swap1: ActivityAssignment = { ...a1, dayOfWeek: a2.dayOfWeek, periodIndex: a2.periodIndex, roomId: a2.roomId };
          const swap2: ActivityAssignment = { ...a2, dayOfWeek: a1.dayOfWeek, periodIndex: a1.periodIndex, roomId: a1.roomId };

          const valid1 = solver.isConsistent(act1, { dayOfWeek: swap1.dayOfWeek, periodIndex: swap1.periodIndex, roomId: swap1.roomId }, tempAssignments);
          tempAssignments.set(act1.id, swap1);
          const valid2 = solver.isConsistent(act2, { dayOfWeek: swap2.dayOfWeek, periodIndex: swap2.periodIndex, roomId: swap2.roomId }, tempAssignments);

          if (valid1 && valid2) {
            tempAssignments.set(act2.id, swap2);
            const newScore = QualityScorer.calculate(Array.from(tempAssignments.values()), context).overallScore;
            const delta = newScore - currentScore;

            if (delta > 0 || Math.exp(delta / (temperature * 10)) > Math.random()) {
              currentSolution[randIdx] = swap1;
              currentSolution[otherRandIdx] = swap2;
              currentScore = newScore;

              if (currentScore > bestScore) {
                bestScore = currentScore;
                bestSolution = currentSolution.map(a => ({ ...a }));
              }
            }
          }
        }
      }
    }

    return bestSolution;
  }
}
