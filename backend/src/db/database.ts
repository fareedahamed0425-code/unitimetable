import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Robust path resolution regardless of whether running from src/ or dist/backend/src/
const isCompiled = __dirname.includes(path.sep + 'dist' + path.sep) || __dirname.includes('/dist/');
const backendRoot = isCompiled 
  ? path.resolve(__dirname, '../../../../') 
  : path.resolve(__dirname, '../../');

let DB_PATH = path.resolve(backendRoot, 'timetable.db');
const SCHEMA_PATH = path.resolve(backendRoot, 'src/db/schema.sql');

if (process.env.VERCEL) {
  DB_PATH = '/tmp/timetable.db';
  const repoDbPath = path.resolve(backendRoot, 'timetable.db');
  // Copy the seeded DB to /tmp if it's the first time the function runs
  if (!fs.existsSync(DB_PATH) && fs.existsSync(repoDbPath)) {
    fs.copyFileSync(repoDbPath, DB_PATH);
  }
}

export const db: Database.Database = new Database(DB_PATH, {
  verbose: process.env.NODE_ENV === 'development' ? undefined : undefined
});

// Enable WAL mode & foreign keys for concurrency and integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase(): void {
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schemaSql);
}

// Transaction helper
export function runInTransaction<T>(fn: () => T): T {
  const transaction = db.transaction(fn);
  return transaction();
}

export default db;
