import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { MemoryAuthStore } from '../auth/memory-store.js';

const cookieOf = (r: { headers: Record<string, unknown> }) => (r.headers['set-cookie'] as string).split(';')[0];

describe('GET /account/summary', () => {
  it('AC9/AC10 keeps each shopper data private and stable across sign-in', async () => {
    const store = new MemoryAuthStore();
    const app = buildApp({ store });
    const a1 = cookieOf(
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { name: 'A', email: 'a@example.com', password: 'password-a' },
      }),
    );
    const userA = (await store.findUserByEmail('a@example.com'))!;
    store.seed(userA.id, {
      bag: [{ name: 'Canvas tote', quantity: 1 }],
      saved: [{ name: 'Linen throw' }],
      orders: [{ number: '1042', status: 'Delivered' }],
    });
    const get = async (c: string) =>
      (await app.inject({ method: 'GET', url: '/account/summary', headers: { cookie: c } })).json();
    const before = await get(a1);
    expect(before.bag.length).toBeGreaterThan(0);
    await app.inject({ method: 'POST', url: '/auth/sign-out', headers: { cookie: a1 } });
    const a2 = cookieOf(
      await app.inject({
        method: 'POST',
        url: '/auth/sign-in',
        payload: { email: 'a@example.com', password: 'password-a' },
      }),
    );
    expect(await get(a2)).toEqual(before);
    const b = cookieOf(
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { name: 'B', email: 'b@example.com', password: 'password-b' },
      }),
    );
    expect(await get(b)).toEqual({ bag: [], saved: [], orders: [] });
  });
});
