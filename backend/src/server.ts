import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { initializePostgresSchema } from './db/database';
import { seedPostgres } from './db/seed_postgres';
import { apiRouter } from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Normalize double slashes
app.use((req, res, next) => {
  if (req.url && req.url.includes('//')) {
    req.url = req.url.replace(/\/+/g, '/');
  }
  next();
});

// Initialise Neon PostgreSQL schema and seed if empty
(async () => {
  try {
    await initializePostgresSchema();

    // Seed only if tables are empty (idempotent)
    const { pgQuery } = await import('./db/database');
    const rows = await pgQuery('SELECT COUNT(*) as cnt FROM users');
    const count = Number(rows[0]?.cnt ?? 0);
    if (count === 0) {
      console.log('No data found — seeding Neon PostgreSQL with Apollo University defaults...');
      await seedPostgres(false);
    } else {
      console.log(`✓ Neon PostgreSQL already contains ${count} user(s). Skipping seed.`);
    }
  } catch (err: any) {
    console.error('Startup DB error:', err.message);
  }
})();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: 'neon-postgresql', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Serve static frontend if bundled
const frontendDist = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../frontend/dist'),
  path.resolve(__dirname, '../../../frontend/dist')
].find(p => fs.existsSync(p));

if (frontendDist) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      return res.sendFile(path.resolve(frontendDist, 'index.html'));
    }
    next();
  });
} else {
  app.get('/', (req, res) => {
    res.send('Apollo University Timetable Backend — Neon PostgreSQL active at /api');
  });
}

process.on('unhandledRejection', (reason: any) => {
  console.warn('Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err: any) => {
  console.warn('Uncaught Exception:', err?.message || err);
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`Apollo University Timetabling System`);
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log(`Database: Neon PostgreSQL (cloud-only)`);
    console.log(`====================================================`);
  });
}

export default app;
