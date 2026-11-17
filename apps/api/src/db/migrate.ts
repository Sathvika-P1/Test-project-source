import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadConfig } from '../config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export interface Queryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: any[] }>;
}

/** Applies each not-yet-applied migration in filename order. Returns names applied. */
export async function migrate(
  db: Queryable,
  dir = path.join(root, 'migrations'),
): Promise<string[]> {
  await db.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())',
  );
  const done = new Set(
    (await db.query('SELECT name FROM schema_migrations')).rows.map(
      (r) => r.name as string,
    ),
  );
  const applied: string[] = [];
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (done.has(file)) continue;
    await db.query(await readFile(path.join(dir, file), 'utf8'));
    await db.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    applied.push(file);
  }
  return applied;
}

export async function seed(
  db: Queryable,
  file = path.join(root, 'seeds', 'catalogue.sql'),
): Promise<void> {
  await db.query(await readFile(file, 'utf8'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pool = new pg.Pool({ connectionString: loadConfig().databaseUrl });
  try {
    console.log('applied:', await migrate(pool));
    if (process.argv.includes('--seed')) await seed(pool);
  } finally {
    await pool.end();
  }
}
