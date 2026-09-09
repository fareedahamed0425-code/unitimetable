/**
 * seed.ts — Redirects all seeding calls to the PostgreSQL seed.
 * SQLite seed logic has been removed. All data lives in Neon PostgreSQL.
 */
import { seedPostgres } from './seed_postgres';

export async function seedDatabase(force: boolean = false): Promise<void> {
  await seedPostgres(force);
}
