import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { createPool } from '../../src/db/pool.js';
import { runMigrations } from '../../src/db/migrate.js';
import { pgProductStore } from '../../src/products/pgStore.js';

const url = process.env.E2E_DATABASE_URL;

describe.skipIf(!url)('products against real Postgres', () => {
  const pool = createPool(url ?? '');
  const app = buildApp({
    resolveSession: async () => ({ userId: 'u1', email:'meera@x.test', role: 'admin' }),
    productStore: pgProductStore(pool),
  });
  let sub: string;
  const body = (subCategoryId: string) => ({
    name: 'Linen shirt',
    brand: 'Harbour',
    description: 'Breathable',
    subCategoryId,
    price: 1599.5,
    sizes: ['M'],
    images: ['https://x.test/a.jpg'],
  });

  beforeAll(async () => {
    await runMigrations(pool);
    sub = (await pool.query("SELECT id FROM sub_categories WHERE name = 'Shirts'")).rows[0].id;
  });
  afterAll(() => pool.end());

  it('creates, re-prices, edits and removes a product', async () => {
    await app.ready();
    const created = await request(app.server).post('/admin/products').send(body(sub)).expect(201);
    const id = created.body.id;
    const listed = await request(app.server).get(`/products?subCategoryId=${sub}`);
    expect(listed.body.map((p: { id: string }) => p.id)).toContain(id);

    const repriced = await request(app.server).patch(`/admin/products/${id}`).send({ price: 1799 }).expect(200);
    expect(repriced.body.price).toBe(1799);
    expect(repriced.body.name).toBe('Linen shirt');

    const renamed = await request(app.server).patch(`/admin/products/${id}`).send({ name: 'Linen shirt, sand' });
    expect(renamed.body.name).toBe('Linen shirt, sand');

    await request(app.server).delete(`/admin/products/${id}`).expect(204);
    await request(app.server).delete(`/admin/products/${id}`).expect(404);
  });

  it('refuses a product with no or unknown sub-category and stores nothing', async () => {
    const before = (await pool.query('SELECT count(*)::int AS n FROM products')).rows[0].n;
    const { subCategoryId: _omit, ...noSub } = body(sub);
    await request(app.server).post('/admin/products').send(noSub).expect(400);
    await request(app.server)
      .post('/admin/products')
      .send(body('00000000-0000-0000-0000-000000000000'))
      .expect(400);
    expect((await pool.query('SELECT count(*)::int AS n FROM products')).rows[0].n).toBe(before);
  });

  it('the database itself rejects a null sub_category_id', async () => {
    await expect(
      pool.query(
        `INSERT INTO products (name, brand, description, sub_category_id, price_minor, sizes, images)
         VALUES ('x','x','x', NULL, 100, '{M}', '{a}')`,
      ),
    ).rejects.toThrow();
  });
});
