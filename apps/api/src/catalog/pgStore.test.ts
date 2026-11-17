import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from '../db/migrate.js';
import { createPool } from '../db/pool.js';
import { createPgCatalogStore } from './pgStore.js';

const url = process.env.TEST_DATABASE_URL;

// Runs only against a disposable Postgres: `TEST_DATABASE_URL=... pnpm test`.
describe.skipIf(!url)('pg catalogue store', () => {
  const pool = createPool(url ?? 'postgresql://unused');
  const store = createPgCatalogStore(pool);

  beforeAll(async () => {
    await migrate(pool);
  });
  afterAll(() => pool.end());

  it('AC7: seeds exactly the seven top-level categories, and re-running the migration keeps seven', async () => {
    await migrate(pool);
    const names = (await store.listTopCategories()).map((t) => t.name);
    expect(names).toEqual(['Men', 'Women', 'Kids', 'Home', 'Beauty', 'GenZ', 'Studio']);
  });

  it('AC4: a product cannot lose its sub-category (NOT NULL)', async () => {
    await expect(pool.query('UPDATE products SET subcategory_id = NULL')).rejects.toMatchObject({
      code: '23502',
    });
  });

  it('refuses to delete a sub-category that has products (RESTRICT)', async () => {
    await expect(
      pool.query('DELETE FROM subcategories WHERE id = (SELECT subcategory_id FROM products LIMIT 1)'),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('adds, renames and refuses case-insensitive duplicates', async () => {
    const name = `Sneakers ${Date.now()}`;
    const added = await store.addSubcategory('men', name);
    expect(added.ok).toBe(true);
    expect(await store.addSubcategory('men', name.toUpperCase())).toEqual({ ok: false, error: 'duplicate' });
    if (added.ok) {
      expect((await store.renameSubcategory(added.value.id, `${name} 2`)).ok).toBe(true);
      expect((await store.removeSubcategory(added.value.id)).ok).toBe(true);
    }
  });
});
