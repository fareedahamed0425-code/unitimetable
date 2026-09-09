import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is missing!');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function initPostgres() {
  console.log('====================================================');
  console.log('Cleaning Neon Database & Creating PostgreSQL Schema');
  console.log('====================================================');
  
  const client = await pool.connect();
  try {
    const schemaSql = fs.readFileSync(path.resolve(__dirname, 'schema_postgres.sql'), 'utf-8');
    await client.query(schemaSql);
    console.log('✓ Successfully executed schema_postgres.sql');
    
    // Verify tables created
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`✓ Created ${res.rows.length} PostgreSQL tables:`);
    res.rows.forEach(r => console.log(`  - ${r.table_name}`));
    console.log('====================================================');
  } catch (err) {
    console.error('Failed to initialize database:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

initPostgres().catch(() => process.exit(1));
