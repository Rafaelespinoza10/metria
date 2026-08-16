import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';

export type Database = NodePgDatabase<typeof schema>;

let pool: pg.Pool | undefined;
let db: Database | undefined;

/** Lazy singleton so importing modules (e.g. in DB-less tests) never requires a database. */
export function getDb(): Database {
  if (!db) {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set. Configure it in backend/.env (see .env.example).');
    }
    pool = new pg.Pool({ connectionString: env.DATABASE_URL });
    db = drizzle(pool, { schema });
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
    db = undefined;
  }
}
