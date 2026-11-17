import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../app.js';
import type { Session, SessionResolver } from '../auth/session.js';

const admin: Session = { userId: 'u1', email: 'meera@x.test', role: 'admin' };
const shopper: Session = { userId: 'u2', email: 'arjun@x.test', role: 'shopper' };

describe('GET /admin/access', () => {
  it('AC1: returns the admin for a signed-in admin', async () => {
    const app = buildApp({ resolveSession: async () => admin });
    const res = await app.inject({ method: 'GET', url: '/admin/access' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ role: 'admin', email: 'meera@x.test' });
    await app.close();
  });

  it('AC2: forbids a signed-in user without the admin role, with no admin data', async () => {
    const app = buildApp({ resolveSession: async () => shopper });
    const res = await app.inject({ method: 'GET', url: '/admin/access' });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'forbidden' });
    expect(res.body).not.toContain('arjun@x.test');
    await app.close();
  });

  it('AC3: rejects a signed-out visitor', async () => {
    const app = buildApp({ resolveSession: async () => null });
    const res = await app.inject({ method: 'GET', url: '/admin/access' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'unauthenticated' });
    await app.close();
  });

  it('AC3: denies everyone by default (no resolver configured)', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: '/admin/access' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'unauthenticated' });
    await app.close();
  });

  it('keeps /health public', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});

describe('admin area gate', () => {
  it('AC4: every admin route is gated by the one hook, resolving the session once', async () => {
    const resolver = vi.fn<SessionResolver>(async () => admin);
    const app = buildApp({
      resolveSession: resolver,
      extraAdminRoutes: async (scope) => {
        scope.get('/admin/ping', async () => ({ pong: true }));
      },
    });
    const res = await app.inject({ method: 'GET', url: '/admin/ping' });
    expect(res.statusCode).toBe(200);
    expect(resolver).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it.each([
    [null, 401],
    [shopper, 403],
  ])('AC4: the same route is denied for %j', async (session, status) => {
    const app = buildApp({
      resolveSession: async () => session,
      extraAdminRoutes: async (scope) => {
        scope.get('/admin/ping', async () => ({ pong: true }));
      },
    });
    const res = await app.inject({ method: 'GET', url: '/admin/ping' });
    expect(res.statusCode).toBe(status);
    await app.close();
  });

  it('AC5: a session created by the shopper sign-in with the admin role opens the area', async () => {
    const sessions = new Map<string, Session>([['sid-1', admin]]);
    const app = buildApp({
      resolveSession: async (req) => sessions.get(req.headers.cookie?.split('sid=')[1] ?? '') ?? null,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/admin/access',
      headers: { cookie: 'sid=sid-1' },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
