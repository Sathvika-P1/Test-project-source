import { afterAll, describe, expect, it } from 'vitest';
import { createPool } from '../../src/db/pool.js';
import { runMigrations } from '../../src/db/migrate.js';

const url = process.env.E2E_DATABASE_URL;

describe.skipIf(!url)('migrations against real Postgres', () => {
  const pool = createPool(url ?? '');
  afterAll(() => pool.end());

  it('running twice keeps one seed row per (top_level, name) and keeps data between runs', async () => {
    await runMigrations(pool);
    const sub = (await pool.query("SELECT id FROM sub_categories WHERE name = 'Tops'")).rows[0].id;
    const { rows } = await pool.query(
      `INSERT INTO products (name, brand, description, sub_category_id, price_minor, sizes, images)
       VALUES ('Mig test','b','d',$1,100,'{M}','{a}') RETURNING id`,
      [sub],
    );
    expect(await runMigrations(pool)).toEqual([]);
    const dupes = await pool.query(
      'SELECT top_level, name FROM sub_categories GROUP BY top_level, name HAVING count(*) > 1',
    );
    expect(dupes.rowCount).toBe(0);
    expect((await pool.query('SELECT 1 FROM products WHERE id = $1', [rows[0].id])).rowCount).toBe(1);
    await pool.query('DELETE FROM products WHERE id = $1', [rows[0].id]);
  });
});
