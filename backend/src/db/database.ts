import dotenv from 'dotenv';
import path from 'path';
import { Pool, PoolClient } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is required. Please set it in backend/.env'
  );
}

// ──────────────────────────────────────────────────────────────
// Neon PostgreSQL Connection Pool — sole data store
// ──────────────────────────────────────────────────────────────
export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

pgPool.on('error', (err: any) => {
  // Catch pool-level background errors (e.g. idle socket drops) so they don't crash the Node process
  console.warn('PostgreSQL pool background notification:', err.message || err);
});

// ──────────────────────────────────────────────────────────────
// Query helpers with automatic retry on transient connection drops
// ──────────────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isTransientError(err: any): boolean {
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('connection terminated') ||
    msg.includes('connection timeout') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('closed unexpectedly')
  );
}

/** Run a SELECT and return all rows with automatic retry on transient connection drops. */
export async function pgQuery<T = any>(text: string, params?: any[], retries = 2): Promise<T[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    let client: PoolClient | null = null;
    try {
      client = await pgPool.connect();
      const res = await client.query(text, params);
      return res.rows as T[];
    } catch (err: any) {
      if (attempt < retries && isTransientError(err)) {
        console.warn(`pgQuery retry (${attempt + 1}/${retries}) after transient error:`, err.message);
        await sleep(500 * (attempt + 1));
        continue;
      }
      console.error('pgQuery error:', err.message, '\nSQL:', text.slice(0, 120));
      throw err;
    } finally {
      if (client) {
        try {
          client.release();
        } catch (_) {}
      }
    }
  }
  throw new Error('pgQuery: unexpected retry loop exit');
}

/** Run an INSERT / UPDATE / DELETE and return rowCount with automatic retry. */
export async function pgExecute(text: string, params?: any[], retries = 2): Promise<number> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    let client: PoolClient | null = null;
    try {
      client = await pgPool.connect();
      const res = await client.query(text, params);
      return res.rowCount || 0;
    } catch (err: any) {
      if (attempt < retries && isTransientError(err)) {
        console.warn(`pgExecute retry (${attempt + 1}/${retries}) after transient error:`, err.message);
        await sleep(500 * (attempt + 1));
        continue;
      }
      console.error('pgExecute error:', err.message, '\nSQL:', text.slice(0, 120));
      throw err;
    } finally {
      if (client) {
        try {
          client.release();
        } catch (_) {}
      }
    }
  }
  throw new Error('pgExecute: unexpected retry loop exit');
}

/** Run multiple statements inside a single BEGIN / COMMIT transaction with automatic retry on initial connect. */
export async function pgTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
  retries = 2
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    let client: PoolClient | null = null;
    try {
      client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (err: any) {
        try {
          await client.query('ROLLBACK');
        } catch (_) {}
        throw err;
      }
    } catch (err: any) {
      if (attempt < retries && isTransientError(err)) {
        console.warn(`pgTransaction retry (${attempt + 1}/${retries}) after transient error:`, err.message);
        await sleep(500 * (attempt + 1));
        continue;
      }
      throw err;
    } finally {
      if (client) {
        try {
          client.release();
        } catch (_) {}
      }
    }
  }
  throw new Error('pgTransaction: unexpected retry loop exit');
}

/** Verify connectivity and ensure the schema tables exist. */
export async function initializePostgresSchema(retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pgQuery('SELECT 1');
      console.log('✓ Neon PostgreSQL connection verified.');

      // Ensure core tables exist (CREATE TABLE IF NOT EXISTS is idempotent)
      const fs = require('fs');
      const schemaPath = path.resolve(__dirname, 'schema_postgres.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
        const stmts = schemaSql
          .split(/;\s*(?=\n|$)/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0 && !s.startsWith('--'));
        const client = await pgPool.connect();
        try {
          for (const stmt of stmts) {
            try {
              await client.query(stmt);
            } catch (_) {
              // Ignore errors for already-existing objects
            }
          }
        } finally {
          client.release();
        }
        console.log('✓ PostgreSQL schema verified / created.');
      }
      return;
    } catch (err: any) {
      if (attempt < retries) {
        console.warn(`Connection attempt ${attempt}/${retries} failed (${err.message}). Retrying in 2s...`);
        await sleep(2000);
      } else {
        console.error('✗ Failed to connect to Neon PostgreSQL:', err.message);
        throw err;
      }
    }
  }
}

/** Always true — PostgreSQL is the only DB. */
export const isPostgresConfigured = true;

// ──────────────────────────────────────────────────────────────
// Legacy stubs — kept so engine files that don't use them
// compile without changes. Nothing calls these in production.
// ──────────────────────────────────────────────────────────────
export const db: any = null;
export function runInTransaction<T>(_fn: () => T): T { throw new Error('runInTransaction: use pgTransaction instead'); }
export function writeThroughPg(_sql: string, _params?: any[]): void { /* no-op */ }
export function syncFromPostgres(): Promise<boolean> { return Promise.resolve(true); }
export function initializeDatabase(): void { /* no-op — schema handled by initializePostgresSchema */ }
