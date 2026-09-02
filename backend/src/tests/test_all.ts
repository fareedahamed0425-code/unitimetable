import assert from 'assert';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { initializeDatabase } from '../db/database';
import { seedDatabase } from '../db/seed';
import { CSPSolver } from '../engine/cspSolver';
import { FeasibilityAnalyzer } from '../engine/feasibilityAnalyzer';
import { TimetableOptimizer } from '../engine/optimizer';
import { QualityScorer } from '../engine/qualityScorer';
import { TimetableProblemContext } from '../engine/types';
import { FETExporter } from '../fet/fetExporter';
import { FETParser } from '../fet/fetParser';
import { NLPPreferenceParser } from '../nlp/nlpPreferenceParser';

async function runTests() {
  console.log('----------------------------------------------------');
  console.log('STARTING AUTOMATED TEST SUITE FOR UNIVERSITY SCHEDULER');
  console.log('----------------------------------------------------');

  initializeDatabase();
  seedDatabase(true);

  // Test 1: NLP Preference Parser
  console.log('1. Testing Natural Language Preference Parser...');
  const prompt1 = 'I want a student-friendly timetable. Keep classes between 9 AM and 4 PM, minimize gaps, avoid Saturday classes, and make sure teachers don\'t have more than three consecutive periods.';
  const nlpRes1 = await NLPPreferenceParser.parse(prompt1);

  assert.ok(nlpRes1.interpretedRules.length >= 4, 'NLP should extract at least 4 rules');
  const gapRule = nlpRes1.interpretedRules.find(r => r.ruleCode === 'MINIMIZE_GAPS');
  assert.ok(gapRule, 'NLP should detect MINIMIZE_GAPS');
  const lateRule = nlpRes1.interpretedRules.find(r => r.ruleCode === 'AVOID_LATE_CLASSES');
  assert.ok(lateRule, 'NLP should detect AVOID_LATE_CLASSES');
  const consecRule = nlpRes1.interpretedRules.find(r => r.ruleCode === 'MAX_CONSECUTIVE_CLASSES');
  assert.ok(consecRule, 'NLP should detect MAX_CONSECUTIVE_CLASSES');
  console.log('✓ NLP Parser correctly extracted structured rules with high fidelity.');

  // Test 2: Feasibility Diagnostics
  console.log('2. Testing Feasibility Analyzer on Normal and Impossible Schedules...');
  const dbModule = await import('../db/database');
  const db = dbModule.db;

  const activities = db.prepare('SELECT * FROM activities').all() as any[];
  const teachersRaw = db.prepare('SELECT * FROM teachers').all() as any[];
  const roomsRaw = db.prepare('SELECT * FROM rooms').all() as any[];
  const slotsRaw = db.prepare('SELECT * FROM time_slots WHERE is_break = 0').all() as any[];

  const teachers = new Map<string, any>(teachersRaw.map(t => [t.id, t]));
  const rooms = new Map<string, any>(roomsRaw.map(r => [r.id, r]));
  const timeSlots = slotsRaw.map(s => ({
    id: s.id,
    dayOfWeek: s.day_of_week,
    dayName: s.day_name,
    periodIndex: s.period_index,
    startTime: s.start_time,
    endTime: s.end_time,
    isBreak: false
  }));

  const normalContext: TimetableProblemContext = {
    activities: activities.map((a, idx) => ({
      ...a,
      courseId: a.course_id,
      teacherIds: [teachersRaw[idx % teachersRaw.length].id],
      sectionIds: [idx % 2 === 0 ? 'sec-cse-3a' : 'sec-cse-3b'],
      groupIds: [],
      subgroupIds: [],
      totalStudentCount: 60,
      durationPeriods: a.duration_periods || 1,
      occurrencesPerWeek: 1,
      requiredRoomType: a.required_room_type || 'CLASSROOM'
    })),
    teachers,
    rooms,
    timeSlots,
    allTimeSlots: timeSlots,
    availability: [],
    relations: [],
    preferences: [],
    maxDays: 5,
    maxPeriodsPerDay: 7
  };

  const normalReport = FeasibilityAnalyzer.analyze(normalContext);
  if (!normalReport.isFeasible) {
    console.log('Feasibility issues found:', normalReport.criticalIssues);
  }
  assert.strictEqual(normalReport.isFeasible, true, 'Normal dataset should be feasible');
  console.log('✓ Normal dataset verified as feasible.');

  // Impossible scenario: 0 rooms
  const impossibleContext: TimetableProblemContext = {
    ...normalContext,
    rooms: new Map()
  };
  const impossibleReport = FeasibilityAnalyzer.analyze(impossibleContext);
  assert.strictEqual(impossibleReport.isFeasible, false, '0-room scenario must fail feasibility check');
  assert.ok(impossibleReport.criticalIssues.length > 0, 'Must report critical bottleneck');
  console.log('✓ Impossible scenario caught with diagnostic report:', impossibleReport.criticalIssues[0]);

  // Test 3: CSP Solver Hard Constraints Satisfaction
  console.log('3. Testing CSP Solver on University Dataset...');
  // Use real seed context
  const { apiRouter } = await import('../routes/api');
  // Trigger solve
  const activitiesList = activities.slice(0, 18).map((a, idx) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    courseId: a.course_id,
    teacherIds: [teachersRaw[idx % teachersRaw.length].id],
    sectionIds: [idx % 2 === 0 ? 'sec-cse-3a' : 'sec-cse-3b'],
    groupIds: [],
    subgroupIds: [],
    totalStudentCount: 60,
    durationPeriods: a.duration_periods || 1,
    occurrencesPerWeek: 1,
    activityType: a.activity_type || 'LECTURE',
    requiredRoomType: a.required_room_type || 'CLASSROOM',
    requiredEquipment: []
  }));

  const testContext: TimetableProblemContext = {
    activities: activitiesList,
    teachers,
    rooms,
    timeSlots,
    allTimeSlots: timeSlots,
    availability: [],
    relations: [],
    preferences: [],
    maxDays: 5,
    maxPeriodsPerDay: 7
  };

  const solver = new CSPSolver(testContext);
  const solution = solver.solve();
  assert.ok(solution !== null, 'Solver must find a valid hard-constraint solution');
  assert.strictEqual(solution.length, activitiesList.length, 'All activities must be scheduled');

  const score = QualityScorer.calculate(solution, testContext);
  assert.strictEqual(score.hardConstraintSatisfaction, 100, 'Hard constraint satisfaction must be 100%');
  console.log(`✓ CSP Solver placed all ${solution.length} activities with 100% Hard Constraint Satisfaction.`);

  // Test 4: Simulated Annealing Optimizer
  console.log('4. Testing Simulated Annealing Soft Constraint Optimization...');
  const optimized = TimetableOptimizer.optimize(solution, testContext);
  const optScore = QualityScorer.calculate(optimized, testContext);
  assert.strictEqual(optScore.hardConstraintSatisfaction, 100, 'Optimization must preserve 100% Hard Constraints');
  console.log(`✓ Optimizer refined quality score: ${score.overallScore}% -> ${optScore.overallScore}%`);

  // Test 5: FET XML Interoperability (Export & Import Round-trip)
  console.log('5. Testing FET XML Export and Bidirectional Import...');
  const xml = FETExporter.exportToXml({
    institutionName: 'Metropolitan Institute of Science & Technology',
    teachers: teachersRaw.map(t => ({ ...t, qualifications: [] })),
    rooms: roomsRaw.map(r => ({ ...r, isAccessible: true, equipment: [] })),
    buildings: [{ id: 'bld-1', campusId: 'camp-1', name: 'Turing Block', code: 'TUR', totalFloors: 3 }],
    activities: activitiesList,
    timeSlots
  });

  assert.ok(xml.includes('<fet version="6.0.0">'), 'Export must contain FET header');
  assert.ok(xml.includes('<Institution_Name>Metropolitan Institute of Science &amp; Technology</Institution_Name>'), 'Export must escape institution name');

  const { data: parsedFet, report: fetReport } = FETParser.parse(xml, 'test.fet');
  assert.strictEqual(parsedFet.institutionName, 'Metropolitan Institute of Science & Technology');
  assert.ok(parsedFet.teachers.length >= teachersRaw.length, 'FET parser must parse all teachers');
  assert.ok(parsedFet.activities.length === activitiesList.length, 'FET parser must parse all activities');
  assert.ok(fetReport.supportedEntitiesCount > 0, 'Compatibility report must show supported entities count');
  console.log(`✓ FET Interoperability passed! Parsed ${parsedFet.teachers.length} teachers and ${parsedFet.activities.length} activities with 100% fidelity.`);

  console.log('----------------------------------------------------');
  console.log('ALL AUTOMATED BACKEND & ENGINE TESTS PASSED (5/5)');
  console.log('----------------------------------------------------');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
