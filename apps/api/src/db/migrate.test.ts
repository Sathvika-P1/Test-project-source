import { readFileSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { migrate, type Queryable } from './migrate.js';

function fakeDb(applied: string[] = []) {
  const queries: string[] = [];
  const db: Queryable = {
    async query(sql) {
      queries.push(sql);
      if (sql.startsWith('SELECT name'))
        return { rows: applied.map((name) => ({ name })) };
      return { rows: [] };
    },
  };
  return { db, queries };
}

describe('migrate', () => {
  it('applies pending files in order and skips applied ones', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'mig-'));
    await writeFile(path.join(dir, '002_b.sql'), 'SELECT 2');
    await writeFile(path.join(dir, '001_a.sql'), 'SELECT 1');
    const { db, queries } = fakeDb(['001_a.sql']);
    expect(await migrate(db, dir)).toEqual(['002_b.sql']);
    expect(queries).toContain('SELECT 2');
    expect(queries).not.toContain('SELECT 1');
  });
});

describe('catalogue seed', () => {
  const sql = readFileSync(
    new URL('../../seeds/catalogue.sql', import.meta.url),
    'utf8',
  );

  it('is idempotent: every INSERT is guarded by ON CONFLICT (slug) DO NOTHING', () => {
    const inserts = sql.match(/INSERT INTO/g) ?? [];
    const guards = sql.match(/ON CONFLICT \(slug\) DO NOTHING/g) ?? [];
    expect(inserts.length).toBeGreaterThan(0);
    expect(guards.length).toBe(inserts.length);
  });

  it('seeds the top-level categories', () => {
    for (const name of ['Men', 'Women', 'Kids', 'Home', 'Beauty', 'GenZ', 'Studio']) {
      expect(sql).toContain(`'${name}'`);
    }
  });
});
