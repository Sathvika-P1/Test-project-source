import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import { PgAuthStore } from '../../src/auth/pg-store.js';
import { migrate } from '../../src/db/migrate.js';
import { createPool } from '../../src/db/pool.js';

// Requires a PostgreSQL reachable at DATABASE_URL.
describe('accounts against PostgreSQL', () => {
  const pool = createPool();
  const app = buildApp({ store: new PgAuthStore(pool) });
  const email = `e2e-${Date.now()}@example.com`;

  beforeAll(async () => {
    await migrate(pool);
    await app.ready();
  });
  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['e2e-%@example.com']);
    await app.close();
    await pool.end();
  });

  it('migrate is idempotent and health still works', async () => {
    expect(await migrate(pool)).toEqual([]);
    expect((await request(app.server).get('/health')).status).toBe(200);
  });

  it('registers, keeps owned data across sign-out/sign-in, and revokes the old session', async () => {
    const reg = await request(app.server).post('/auth/register').send({ name: 'E2E', email, password: 'correct-horse' });
    expect(reg.status).toBe(201);
    await pool.query('INSERT INTO bag_items (user_id, name, quantity) VALUES ($1, $2, 1)', [reg.body.user.id, 'Canvas tote']);
    const first = (reg.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    const before = (await request(app.server).get('/account/summary').set('Cookie', first)).body;
    await request(app.server).post('/auth/sign-out').set('Cookie', first);
    expect((await request(app.server).get('/account/summary').set('Cookie', first)).status).toBe(401);
    const again = await request(app.server).post('/auth/sign-in').send({ email, password: 'correct-horse' });
    const second = (again.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    expect((await request(app.server).get('/account/summary').set('Cookie', second)).body).toEqual(before);
    expect(before.bag).toHaveLength(1);
  });
});
