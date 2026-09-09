import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Pool, PoolClient } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Robust path resolution
const isCompiled = __dirname.includes(path.sep + 'dist' + path.sep) || __dirname.includes('/dist/');
const backendRoot = isCompiled 
  ? path.resolve(__dirname, '../../../../') 
  : path.resolve(__dirname, '../../');

let DB_PATH = process.env.DATABASE_PATH 
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(backendRoot, 'timetable.db');

const SCHEMA_PATH = fs.existsSync(path.resolve(backendRoot, 'src/db/schema.sql'))
  ? path.resolve(backendRoot, 'src/db/schema.sql')
  : path.resolve(__dirname, 'schema.sql');

if (process.env.VERCEL) {
  DB_PATH = '/tmp/timetable.db';
}

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db: Database.Database = new Database(DB_PATH, {
  verbose: undefined
});

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ----------------------------------------------------
// PostgreSQL Neon DB Connection Pool
// ----------------------------------------------------
export const isPostgresConfigured = Boolean(process.env.DATABASE_URL);

export const pgPool = isPostgresConfigured
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    })
  : null;

// Async query helper for direct PostgreSQL operations
export async function pgQuery<T = any>(text: string, params?: any[]): Promise<T[]> {
  if (!pgPool) return [];
  const client = await pgPool.connect();
  try {
    const res = await client.query(text, params);
    return res.rows;
  } catch (err) {
    console.error('PostgreSQL Query Error:', err, { text, params });
    throw err;
  } finally {
    client.release();
  }
}

export async function pgExecute(text: string, params?: any[]): Promise<number> {
  if (!pgPool) return 0;
  const client = await pgPool.connect();
  try {
    const res = await client.query(text, params);
    return res.rowCount || 0;
  } catch (err) {
    console.error('PostgreSQL Execute Error:', err, { text, params });
    throw err;
  } finally {
    client.release();
  }
}

// Convert SQLite '?' placeholders to PostgreSQL '$1, $2...'
export function convertSqliteToPg(sql: string): string {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

// Write-through helper to persist mutations to PostgreSQL
export function writeThroughPg(sql: string, params: any[] = []): void {
  if (!pgPool) return;
  const pgSql = convertSqliteToPg(sql);
  pgPool.query(pgSql, params).catch(err => {
    console.warn('Background write-through to PostgreSQL warning:', err.message);
  });
}

const SYNC_TABLES = [
  'universities',
  'campuses',
  'faculties',
  'departments',
  'programs',
  'academic_years',
  'semesters',
  'batches',
  'sections',
  'student_groups',
  'student_subgroups',
  'teachers',
  'teacher_qualifications',
  'students',
  'buildings',
  'rooms',
  'equipment',
  'room_equipment',
  'time_slots',
  'courses',
  'course_required_equipment',
  'activities',
  'activity_teacher_assignments',
  'activity_student_assignments',
  'activity_required_equipment',
  'activity_relations',
  'entity_availability',
  'preference_profiles',
  'smart_preference_rules',
  'timetables',
  'timetable_entries',
  'timetable_versions',
  'conflicts',
  'generation_jobs',
  'audit_logs',
  'fet_import_history',
  'uploaded_files',
  'users'
];

export async function syncFromPostgres(): Promise<boolean> {
  if (!pgPool) return false;
  try {
    const client = await pgPool.connect();
    try {
      console.log('Synchronizing tables from Neon PostgreSQL...');
      
      // Initialize local SQLite tables first
      initializeDatabase();

      for (const table of SYNC_TABLES) {
        try {
          const res = await client.query(`SELECT * FROM ${table}`);
          if (res.rows.length > 0) {
            // Clear local table and insert rows from PostgreSQL
            try {
              db.prepare(`DELETE FROM ${table}`).run();
            } catch {}

            const cols = Object.keys(res.rows[0]);
            const placeholders = cols.map(() => '?').join(', ');
            const insertSql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
            const insertStmt = db.prepare(insertSql);

            const tx = db.transaction((rows: any[]) => {
              for (const row of rows) {
                const values = cols.map(c => {
                  const val = row[c];
                  if (val instanceof Date) return val.toISOString();
                  if (typeof val === 'boolean') return val ? 1 : 0;
                  return val;
                });
                insertStmt.run(...values);
              }
            });
            tx(res.rows);
          }
        } catch (tableErr: any) {
          // Table might not exist or empty
        }
      }
      console.log('✓ Successfully synchronized state with Neon PostgreSQL.');
      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('Could not sync from PostgreSQL, falling back to local storage:', err.message);
    return false;
  }
}

export function initializeDatabase(): void {
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schemaSql);

  // Safe runtime migrations for SQLite cache
  try {
    const userCols = db.prepare('PRAGMA table_info(users)').all() as any[];
    if (userCols.length > 0 && !userCols.some(c => c.name === 'password_hash')) {
      db.exec('DROP TABLE users');
      db.exec(schemaSql);
    }
  } catch (e) {
    console.warn('SQLite migration warning:', e);
  }
}

export function runInTransaction<T>(fn: () => T): T {
  const transaction = db.transaction(fn);
  return transaction();
}

export default db;
