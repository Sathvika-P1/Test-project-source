import { describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { MemoryAuthStore } from '../auth/memory-store.js';

function setup() {
  const store = new MemoryAuthStore();
  let t = Date.parse('2026-01-01T00:00:00Z');
  const clock = { advance: (ms: number) => (t += ms) };
  const app = buildApp({ store, now: () => new Date(t) });
  return { app, store, clock };
}
const reg = (app: FastifyInstance, email = 'asha@example.com', password = 'correct-horse', extra = {}) =>
  app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Asha Rao', email, password, ...extra } });
const login = (app: FastifyInstance, email: string, password: string) =>
  app.inject({ method: 'POST', url: '/auth/sign-in', payload: { email, password } });
const sid = (res: { headers: Record<string, unknown> }) => (res.headers['set-cookie'] as string).split(';')[0];

describe('auth routes', () => {
  it('AC1/AC2 registers then signs in with no verification step', async () => {
    const { app } = setup();
    const r = await reg(app);
    expect(r.statusCode).toBe(201);
    expect(Object.keys(r.json().user)).toEqual(['id', 'name', 'email', 'role']);
    expect((await login(app, 'asha@example.com', 'correct-horse')).statusCode).toBe(200);
  });
  it('AC3 sign-in sets an HttpOnly cookie and /auth/me shows the user', async () => {
    const { app } = setup();
    await reg(app);
    const l = await login(app, 'asha@example.com', 'correct-horse');
    expect(l.headers['set-cookie']).toMatch(/^sid=.+; .*HttpOnly/);
    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: sid(l) } });
    expect(me.json().user.email).toBe('asha@example.com');
  });
  it('AC4/AC5 sign-out clears the cookie and revokes the old session', async () => {
    const { app } = setup();
    const c = sid(await reg(app));
    const out = await app.inject({ method: 'POST', url: '/auth/sign-out', headers: { cookie: c } });
    expect(out.statusCode).toBe(204);
    expect(out.headers['set-cookie']).toMatch(/Max-Age=0/);
    expect((await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: c } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/account/summary', headers: { cookie: c } })).statusCode).toBe(401);
  });
  it('AC6 unknown email and wrong password look identical', async () => {
    const { app } = setup();
    await reg(app);
    const unknown = await login(app, 'nobody@example.com', 'whatever-1');
    const wrong = await login(app, 'asha@example.com', 'wrong-pass');
    expect(unknown.statusCode).toBe(401);
    expect(wrong.statusCode).toBe(401);
    expect(unknown.json()).toEqual(wrong.json());
    expect(wrong.json().message).toBe('Email or password is incorrect. Check both and try again.');
  });
  it('AC12 registration signs in straight away', async () => {
    const { app } = setup();
    const r = await reg(app);
    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: sid(r) } });
    expect(me.statusCode).toBe(200);
  });
  it('AC13 duplicate email (any case) gets a generic refusal', async () => {
    const { app } = setup();
    await reg(app);
    const dup = await reg(app, 'ASHA@example.com', 'another-pass');
    expect(dup.statusCode).toBe(409);
    expect(dup.json().message).toBe('We could not create an account with these details. Try different details or sign in.');
    expect(dup.json().message).not.toMatch(/registered|exists|already/i);
  });
  it('AC14 invalid registration is a 400 and creates no user', async () => {
    const { app, store } = setup();
    const r = await reg(app, 'asha@example.com', '1234567');
    expect(r.statusCode).toBe(400);
    expect(r.json().fieldErrors.password).toBeDefined();
    expect(await store.findUserByEmail('asha@example.com')).toBeNull();
  });
  it('AC16 an 8 character password is accepted', async () => {
    const { app } = setup();
    expect((await reg(app, 'a@example.com', '12345678')).statusCode).toBe(201);
  });
  it('AC8 registration never grants admin', async () => {
    const { app } = setup();
    expect((await reg(app, 'a@example.com', '12345678', { role: 'admin' })).json().user.role).toBe('shopper');
  });
  it('AC18-20 lockout after 5 failures lasts 15 minutes', async () => {
    const { app, clock } = setup();
    await reg(app);
    for (let i = 0; i < 4; i++) await login(app, 'asha@example.com', 'wrong-pass');
    expect((await login(app, 'asha@example.com', 'correct-horse')).statusCode).toBe(200);
    for (let i = 0; i < 5; i++) await login(app, 'asha@example.com', 'wrong-pass');
    const locked = await login(app, 'asha@example.com', 'correct-horse');
    expect(locked.statusCode).toBe(429);
    expect(locked.json().message).toBe('Too many failed attempts. Try again in 15 minutes.');
    clock.advance(14 * 60_000 + 59_000);
    expect((await login(app, 'asha@example.com', 'correct-horse')).statusCode).toBe(429);
    clock.advance(1_000);
    expect((await login(app, 'asha@example.com', 'correct-horse')).statusCode).toBe(200);
  });
  it('AC19 parallel guesses cannot exceed the 5 attempt limit', async () => {
    const { app } = setup();
    await reg(app);
    const guesses = Array.from({ length: 10 }, (_, i) => (i === 7 ? 'correct-horse' : 'wrong-pass'));
    const results = await Promise.all(guesses.map((g) => login(app, 'asha@example.com', g)));
    expect(results[7].statusCode).toBe(429);
    expect(results.filter((r) => r.statusCode === 401)).toHaveLength(5);
    expect(results.filter((r) => r.statusCode === 429)).toHaveLength(5);
  });
  it('a malformed percent escape in the Cookie header is treated as no session, not a 500', async () => {
    const { app } = setup();
    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: 'sid=%E0%A4%A' } });
    expect(me.statusCode).toBeLessThan(500);
    const guarded = await app.inject({ method: 'GET', url: '/account/summary', headers: { cookie: 'sid=%' } });
    expect(guarded.statusCode).toBe(401);
  });
  it('AC19 an unregistered email locks identically', async () => {
    const { app } = setup();
    for (let i = 0; i < 5; i++) await login(app, 'ghost@example.com', 'wrong-pass');
    expect((await login(app, 'ghost@example.com', 'wrong-pass')).statusCode).toBe(429);
  });
});
