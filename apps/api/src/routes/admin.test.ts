import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { MemoryAuthStore } from '../auth/memory-store.js';

async function join(app: ReturnType<typeof buildApp>, email: string) {
  const r = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { name: 'N', email, password: 'correct-horse' },
  });
  return (r.headers['set-cookie'] as string).split(';')[0];
}

describe('GET /admin/status', () => {
  it('AC7 shows administration to an admin', async () => {
    const store = new MemoryAuthStore();
    const app = buildApp({ store });
    const cookie = await join(app, 'priya@example.com');
    store.setRole('priya@example.com', 'admin');
    const res = await app.inject({ method: 'GET', url: '/admin/status', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ area: 'store-administration' });
  });
  it('AC8 refuses a non-admin and a signed-out visitor', async () => {
    const app = buildApp({ store: new MemoryAuthStore() });
    const cookie = await join(app, 'asha@example.com');
    const res = await app.inject({ method: 'GET', url: '/admin/status', headers: { cookie } });
    expect(res.statusCode).toBe(403);
    expect(res.json().message).toBe('You do not have access to store administration.');
    expect((await app.inject({ method: 'GET', url: '/admin/status' })).statusCode).toBe(401);
  });
});
