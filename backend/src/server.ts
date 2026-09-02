import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { initializeDatabase } from './db/database';
import { seedDatabase } from './db/seed';
import { apiRouter } from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize DB and Seed Demo Data
initializeDatabase();
seedDatabase(false);

// Register API Router
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


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
