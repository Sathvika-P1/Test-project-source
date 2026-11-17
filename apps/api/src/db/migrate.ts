import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';
import { loadConfig } from '../config.js';
import { createPool } from './pool.js';

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../migrations');

/** Applies each `NNN_name.sql` once, in order, recording it in schema_migrations. */
export async function runMigrations(pool: Pool, dir: string = MIGRATIONS_DIR): Promise<string[]> {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const files = (await readdir(dir)).filter((f) => /^\d+_.+\.sql$/.test(f) && !f.endsWith('.down.sql')).sort();
  const applied: string[] = [];
  for (const file of files) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(7036)');
      const done = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
      if (done.rowCount === 0) {
        await client.query(await readFile(path.join(dir, file), 'utf8'));
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        applied.push(file);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  return applied;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const pool = createPool(loadConfig().databaseUrl);
  runMigrations(pool)
    .then((applied) => console.log(applied.length ? `applied: ${applied.join(', ')}` : 'up to date'))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
