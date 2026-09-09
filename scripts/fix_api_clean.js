const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../backend/src/routes/api.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const targetStr = `        c.dayOfWeek, c.periodIndex, c.violatedConstraintRule, c.suggestedFix || null
      ]);
    }

    const rooms = Array.from(context.rooms.values());`;

const replacementStr = `        c.dayOfWeek, c.periodIndex, c.violatedConstraintRule, c.suggestedFix || null
      ]);
    }

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
// 13. DATA CLEANUP & RESET
// ----------------------------------------------------
apiRouter.post('/admin/clean-data', async (req: Request, res: Response) => {
  try {
    const { mode = 'FULL_FACTORY_RESET', timetableId = 'tt-active' } = req.body;

    if (mode === 'TIMETABLE_ENTRIES_ONLY') {
      // Clear timetable entries and conflicts for active timetable
      await pgExecute(\`DELETE FROM timetable_entries WHERE timetable_id = $1\`, [timetableId]);
      await pgExecute(\`DELETE FROM conflicts WHERE timetable_id = $1\`, [timetableId]);
      await pgExecute(\`UPDATE timetables SET quality_score_json = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1\`, [timetableId]);

      return res.json({
        success: true,
        message: 'Active timetable grid cleared successfully. All scheduled sessions have been removed.'
      });
    }

    if (mode === 'ALL_TIMETABLES_AND_SESSIONS') {
      // Clear all timetable entries across all timetables
      await pgExecute(\`DELETE FROM timetable_entries\`);
      await pgExecute(\`DELETE FROM conflicts\`);
      await pgExecute(\`DELETE FROM generation_jobs\`);
      await pgExecute(\`DELETE FROM timetable_versions\`);
      await pgExecute(\`UPDATE timetables SET quality_score_json = NULL, updated_at = CURRENT_TIMESTAMP\`);

      return res.json({
        success: true,
        message: 'All timetable entries across all semesters and batches have been cleared.'
      });
    }

    if (mode === 'CLEAR_CURRICULUM_AND_ACTIVITIES') {
      // Clear timetable entries + activities + course assignments + uploaded sheets
      await pgExecute(\`DELETE FROM timetable_entries\`);
      await pgExecute(\`DELETE FROM conflicts\`);
      await pgExecute(\`DELETE FROM generation_jobs\`);
      await pgExecute(\`DELETE FROM timetable_versions\`);
      await pgExecute(\`DELETE FROM activity_student_assignments\`);
      await pgExecute(\`DELETE FROM activity_teacher_assignments\`);
      await pgExecute(\`DELETE FROM activity_required_equipment\`);
      await pgExecute(\`DELETE FROM activity_relations\`);
      await pgExecute(\`DELETE FROM activities\`);
      await pgExecute(\`DELETE FROM course_required_equipment\`);
      await pgExecute(\`DELETE FROM courses\`);
      await pgExecute(\`DELETE FROM fet_import_history\`);
      await pgExecute(\`DELETE FROM uploaded_files\`);
      await pgExecute(\`UPDATE timetables SET quality_score_json = NULL, updated_at = CURRENT_TIMESTAMP\`);

      return res.json({
        success: true,
        message: 'All timetable entries, curriculum subjects, and activity allocations cleared successfully.'
      });
    }

    // Default: FULL_FACTORY_RESET
    console.log('Initiating complete factory clean data reset...');
    await seedDatabase(true);

    return res.json({
      success: true,
      message: 'Full system data cleaned and reset to clean 4-department configuration.'
    });
  } catch (err: any) {
    console.error('Clean data error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to clean data' });
  }
});

apiRouter.post('/admin/reset-database', async (req: Request, res: Response) => {
  try {
    console.log('Initiating database reset to clean 4-department configuration...');
    await seedDatabase(true);
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
    await pgTransaction(async (client) => {
      for (const p of periodTemplates) {
        await client.query(\`
          INSERT INTO time_slots (id, day_of_week, day_name, period_index, start_time, end_time, is_break, label)
          VALUES ($1, 5, 'Saturday', $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO NOTHING
        \`, [\`slot-5-\${p.index}\`, p.index, p.start, p.end, p.isBreak, p.label]);
        added++;
      }
    });

    res.json({
      success: true,
      message: \`Saturday time slots migration complete. \${added} new slots added.\`,
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

    const context = await buildProblemContext();
    const entriesRaw = (await pgQuery(\`SELECT * FROM timetable_entries WHERE timetable_id = $1\`, [timetableId])) as any[];
    const courses = (await pgQuery(\`SELECT * FROM courses\`)) as Course[];
    const courseMap = new Map(courses.map(c => [c.id, c]));
    const teachers = Array.from(context.teachers.values());
    const rooms = Array.from(context.rooms.values());`;

if (!content.includes(targetStr)) {
  console.error('targetStr not found!');
  process.exit(1);
}

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully updated api.ts!');
