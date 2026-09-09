import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { initializeDatabase, syncFromPostgres } from './db/database';
import { seedDatabase } from './db/seed';
import { apiRouter } from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Normalize double or multiple slashes (e.g. //auth/login -> /auth/login)
app.use((req, res, next) => {
  if (req.url && req.url.includes('//')) {
    req.url = req.url.replace(/\/+/g, '/');
  }
  next();
});

// Initialize DB and Seed PostgreSQL / Local Data
initializeDatabase();
syncFromPostgres().then(synced => {
  if (!synced) {
    seedDatabase(false);
  }
}).catch(() => {
  seedDatabase(false);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register API Router under both /api and root / for deployment versatility
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Serve static frontend if bundled together
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
  // Root fallback message
  app.get('/', (req, res) => {
    res.send('University Timetable Backend API is active at /api');
  });
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`University Timetabling System Backend API`);
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log(`FET Interoperability Layer: READY`);
    console.log(`CSP Constraint Solver & Optimizer: READY`);
    console.log(`====================================================`);
  });
}

export default app;
