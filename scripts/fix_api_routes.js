const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'backend', 'src', 'routes', 'api.ts');
let code = fs.readFileSync(filePath, 'utf8');

const sec15Idx = code.indexOf('// 15. EMAIL DISPATCH');
if (sec15Idx === -1) {
  console.error('Section 15 not found');
  process.exit(1);
}

const sec18Idx = code.indexOf('// 18. SECTIONS + COHORTS CRUD');
if (sec18Idx === -1) {
  console.error('Section 18 not found');
  process.exit(1);
}

const replacement = `// 15. EMAIL DISPATCH — Send timetables to all faculty
// ============================================================
apiRouter.post('/admin/dispatch-timetables', async (req: Request, res: Response) => {
  try {
    const { timetableId = 'tt-active' } = req.body;
    const result = await dispatchTimetablesToFaculty(timetableId);
    res.json(result);
  } catch (err: any) {
    console.error('Dispatch Timetables Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to dispatch timetables' });
  }
});

// ============================================================
// 16. TIME SLOTS & CALENDAR CRUD (Year-Specific & General)
// ============================================================

// Public calendar endpoint (year-aware)
apiRouter.get('/calendar', async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    let slots: any[] = [];
    if (year !== undefined && !isNaN(year) && year > 0) {
      slots = await pgQuery(
        \`SELECT * FROM time_slots WHERE year_number = $1 ORDER BY day_of_week ASC, period_index ASC\`,
        [year]
      );
      if (!slots.length) {
        slots = await pgQuery(
          \`SELECT * FROM time_slots WHERE year_number = 0 ORDER BY day_of_week ASC, period_index ASC\`
        );
      }
    } else {
      slots = await pgQuery(
        \`SELECT * FROM time_slots ORDER BY year_number ASC, day_of_week ASC, period_index ASC\`
      );
    }
    res.json({ success: true, data: slots });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin calendar slots list with year filter
apiRouter.get('/admin/calendar/slots', async (req: Request, res: Response) => {
  try {
    const yearParam = req.query.year;
    let slots: any[] = [];
    if (yearParam !== undefined && yearParam !== 'ALL' && yearParam !== '') {
      const yr = parseInt(yearParam as string, 10);
      slots = await pgQuery(
        \`SELECT * FROM time_slots WHERE year_number = $1 ORDER BY day_of_week ASC, period_index ASC\`,
        [yr]
      );
    } else {
      slots = await pgQuery(
        \`SELECT * FROM time_slots ORDER BY year_number ASC, day_of_week ASC, period_index ASC\`
      );
    }
    res.json({ success: true, data: slots });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add single time slot
apiRouter.post('/admin/calendar/slots', async (req: Request, res: Response) => {
  try {
    const { day_of_week, day_name, period_index, start_time, end_time, label, is_break, year_number } = req.body;
    const yr = year_number !== undefined ? parseInt(year_number, 10) : 1;
    const dow = day_of_week !== undefined ? parseInt(day_of_week, 10) : 0;
    const pIdx = period_index !== undefined ? parseInt(period_index, 10) : 0;
    const id = \`ts-y\${yr}-d\${dow}-p\${pIdx}-\${Date.now()}\`;
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dName = day_name || dayNames[dow] || \`Day \${dow}\`;

    await pgExecute(
      \`INSERT INTO time_slots (id, day_of_week, day_name, period_index, start_time, end_time, is_break, label, year_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)\`,
      [id, dow, dName, pIdx, start_time || '09:00', end_time || '10:00', is_break ? 1 : 0, label || null, yr]
    );

    const created = await pgQuery(\`SELECT * FROM time_slots WHERE id = $1\`, [id]);
    res.json({ success: true, data: created[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update time slot
apiRouter.put('/admin/calendar/slots/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { start_time, end_time, label, is_break, year_number, period_index, day_of_week } = req.body;
    await pgExecute(
      \`UPDATE time_slots
       SET start_time = COALESCE($1, start_time),
           end_time = COALESCE($2, end_time),
           label = $3,
           is_break = COALESCE($4, is_break),
           year_number = COALESCE($5, year_number),
           period_index = COALESCE($6, period_index),
           day_of_week = COALESCE($7, day_of_week)
       WHERE id = $8\`,
      [
        start_time || null,
        end_time || null,
        label !== undefined ? label : null,
        is_break !== undefined ? (is_break ? 1 : 0) : null,
        year_number !== undefined ? parseInt(year_number, 10) : null,
        period_index !== undefined ? parseInt(period_index, 10) : null,
        day_of_week !== undefined ? parseInt(day_of_week, 10) : null,
        id
      ]
    );
    const updated = await pgQuery(\`SELECT * FROM time_slots WHERE id = $1\`, [id]);
    res.json({ success: true, data: updated[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete time slot
apiRouter.delete('/admin/calendar/slots/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pgExecute(\`DELETE FROM time_slots WHERE id = $1\`, [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Populate standard default schedule for a year
apiRouter.post('/admin/calendar/slots/populate-default', async (req: Request, res: Response) => {
  try {
    const { year = 1 } = req.body;
    const yr = parseInt(year, 10) || 1;
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const defaultPeriods = [
      { period_index: 0, start_time: '09:00', end_time: '09:50', is_break: 0, label: 'Period 1' },
      { period_index: 1, start_time: '09:50', end_time: '10:40', is_break: 0, label: 'Period 2' },
      { period_index: 2, start_time: '10:40', end_time: '10:55', is_break: 1, label: 'Tea / Morning Break' },
      { period_index: 3, start_time: '10:55', end_time: '11:45', is_break: 0, label: 'Period 3' },
      { period_index: 4, start_time: '11:45', end_time: '12:35', is_break: 0, label: 'Period 4' },
      { period_index: 5, start_time: '12:35', end_time: '13:25', is_break: 1, label: 'Lunch Break' },
      { period_index: 6, start_time: '13:25', end_time: '14:15', is_break: 0, label: 'Period 5' },
      { period_index: 7, start_time: '14:15', end_time: '15:05', is_break: 0, label: 'Period 6' },
      { period_index: 8, start_time: '15:05', end_time: '15:55', is_break: 0, label: 'Period 7' }
    ];

    await pgTransaction(async (client) => {
      await client.query(\`DELETE FROM time_slots WHERE year_number = $1\`, [yr]);

      for (let d = 0; d < 6; d++) {
        for (const p of defaultPeriods) {
          const id = \`ts-y\${yr}-d\${d}-p\${p.period_index}\`;
          await client.query(
            \`INSERT INTO time_slots (id, day_of_week, day_name, period_index, start_time, end_time, is_break, label, year_number)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)\`,
            [id, d, dayNames[d], p.period_index, p.start_time, p.end_time, p.is_break, p.label, yr]
          );
        }
      }
    });

    res.json({ success: true, message: \`Standard 8-period schedule populated for Year \${yr}\`, count: 6 * defaultPeriods.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Copy Year schedule to another year
apiRouter.post('/admin/calendar/slots/copy-year', async (req: Request, res: Response) => {
  try {
    const { sourceYear = 1, targetYear = 2 } = req.body;
    const sYr = parseInt(sourceYear, 10);
    const tYr = parseInt(targetYear, 10);

    const sourceSlots = (await pgQuery(
      \`SELECT * FROM time_slots WHERE year_number = $1 ORDER BY day_of_week ASC, period_index ASC\`,
      [sYr]
    )) as any[];

    if (!sourceSlots.length) {
      return res.status(400).json({ success: false, error: \`No periods found for Year \${sYr} to copy from\` });
    }

    await pgTransaction(async (client) => {
      await client.query(\`DELETE FROM time_slots WHERE year_number = $1\`, [tYr]);
      for (const s of sourceSlots) {
        const newId = \`ts-y\${tYr}-d\${s.day_of_week}-p\${s.period_index}-\${Date.now()}\`;
        await client.query(
          \`INSERT INTO time_slots (id, day_of_week, day_name, period_index, start_time, end_time, is_break, label, year_number)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)\`,
          [newId, s.day_of_week, s.day_name, s.period_index, s.start_time, s.end_time, s.is_break, s.label, tYr]
        );
      }
    });

    res.json({ success: true, message: \`Successfully copied \${sourceSlots.length} periods from Year \${sYr} to Year \${tYr}\` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Apply single day timings across all 6 days (Mon-Sat) for a year
apiRouter.post('/admin/calendar/slots/apply-all-days', async (req: Request, res: Response) => {
  try {
    const { year = 1, sourceDay = 0 } = req.body;
    const yr = parseInt(year, 10) || 1;
    const sDay = parseInt(sourceDay, 10) || 0;
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const sourceSlots = (await pgQuery(
      \`SELECT * FROM time_slots WHERE year_number = $1 AND day_of_week = $2 ORDER BY period_index ASC\`,
      [yr, sDay]
    )) as any[];

    if (!sourceSlots.length) {
      return res.status(400).json({ success: false, error: \`No time periods configured on \${dayNames[sDay] || 'selected day'} for Year \${yr}\` });
    }

    await pgTransaction(async (client) => {
      await client.query(\`DELETE FROM time_slots WHERE year_number = $1 AND day_of_week != $2\`, [yr, sDay]);

      for (let d = 0; d < 6; d++) {
        if (d === sDay) continue;
        for (const s of sourceSlots) {
          const newId = \`ts-y\${yr}-d\${d}-p\${s.period_index}-\${Date.now()}\`;
          await client.query(
            \`INSERT INTO time_slots (id, day_of_week, day_name, period_index, start_time, end_time, is_break, label, year_number)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)\`,
            [newId, d, dayNames[d], s.period_index, s.start_time, s.end_time, s.is_break, s.label, yr]
          );
        }
      }
    });

    res.json({ success: true, message: \`Successfully synced \${dayNames[sDay]} timings across all 6 days for Year \${yr}\` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 17. ROOMS & BUILDINGS CRUD
// ============================================================
apiRouter.get('/admin/rooms', async (req: Request, res: Response) => {
  try {
    const rooms = await pgQuery(\`
      SELECT r.*, b.name as building_name, b.code as building_code, d.name as dept_name, d.code as dept_code
      FROM rooms r
      LEFT JOIN buildings b ON b.id = r.building_id
      LEFT JOIN departments d ON d.id = r.department_id
      ORDER BY b.name ASC, r.name ASC
    \`);
    const buildings = await pgQuery(\`SELECT * FROM buildings ORDER BY name ASC\`);
    res.json({ success: true, data: { rooms, buildings } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/admin/rooms', async (req: Request, res: Response) => {
  try {
    const { name, code, building_id, floor, capacity, room_type, is_accessible, department_id } = req.body;
    const id = \`room-\${(code || name || 'rm').toLowerCase().replace(/[^a-z0-9]/g, '')}-\${Date.now()}\`;
    await pgExecute(
      \`INSERT INTO rooms (id, building_id, name, code, floor, capacity, room_type, is_accessible, department_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)\`,
      [id, building_id, name, code, floor || 1, capacity || 60, room_type || 'CLASSROOM', is_accessible ? 1 : 1, department_id || null]
    );
    res.json({ success: true, id, data: { id, name, code, building_id, floor, capacity, room_type } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.put('/admin/rooms/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, floor, capacity, room_type, is_accessible, department_id, building_id } = req.body;
    await pgExecute(
      \`UPDATE rooms SET name=$1, code=$2, floor=$3, capacity=$4, room_type=$5, is_accessible=$6, department_id=$7, building_id=$8 WHERE id=$9\`,
      [name, code, floor, capacity, room_type, is_accessible ? 1 : 0, department_id || null, building_id, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/admin/rooms/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pgExecute(\`DELETE FROM rooms WHERE id=$1\`, [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/admin/buildings', async (req: Request, res: Response) => {
  try {
    const buildings = await pgQuery(\`SELECT * FROM buildings ORDER BY name ASC\`);
    res.json({ success: true, data: buildings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/admin/buildings', async (req: Request, res: Response) => {
  try {
    const { name, code, total_floors } = req.body;
    const campus = (((await pgQuery(\`SELECT id FROM campuses LIMIT 1\`))[0]) as any)?.id || 'camp-main';
    const id = \`bld-\${(code || name || 'bld').toLowerCase().replace(/[^a-z0-9]/g, '')}-\${Date.now()}\`;
    await pgExecute(\`INSERT INTO buildings (id, campus_id, name, code, total_floors) VALUES ($1,$2,$3,$4,$5)\`, [id, campus, name, code, total_floors || 3]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/admin/buildings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pgExecute(\`DELETE FROM buildings WHERE id=$1\`, [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

`;

const newCode = code.slice(0, sec15Idx) + replacement + code.slice(sec18Idx);
fs.writeFileSync(filePath, newCode, 'utf8');
console.log('Successfully updated backend/src/routes/api.ts!');
