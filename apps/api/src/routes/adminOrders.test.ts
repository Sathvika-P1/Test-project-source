import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import type { Session } from '../auth/session.js';
import type { OrderDetail, OrderStore } from '../orders/store.js';

const admin: Session = { userId: 'u1', email: 'meera@x.test', role: 'admin' };
const shopper: Session = { userId: 'u2', email: 'arjun@x.test', role: 'shopper' };

function seed(): OrderDetail[] {
  return [
    {
      id: 'SW-10482',
      customer: 'Arjun Rao',
      email: 'arjun@example.com',
      placedAt: '2026-11-14T10:00:00.000Z',
      status: 'placed',
      hasSupportRequest: true,
      total: 4349,
      currency: 'INR',
      address: '12 Lake View Road, Indiranagar, Bengaluru 560038',
      payment: 'Paid by UPI',
      items: [
        { name: 'Block-print cotton kurta', detail: 'Size M × 1', price: 1899 },
        { name: 'Terracotta tea set', detail: 'Set of 6 × 1', price: 2450 },
      ],
      supportRequest: {
        subject: 'Change delivery address',
        message: 'Could you deliver to my office instead?',
        sentAt: '2026-11-15T09:00:00.000Z',
      },
    },
    {
      id: 'SW-10477',
      customer: 'Divya Menon',
      email: 'divya.menon@example.com',
      placedAt: '2026-11-13T10:00:00.000Z',
      status: 'packed',
      hasSupportRequest: false,
      total: 1599,
      currency: 'INR',
      address: '8 Beach Road, Kozhikode 673001',
      payment: 'Paid by card',
      items: [{ name: 'Linen shirt, sand', detail: 'Size L × 1', price: 1599 }],
      supportRequest: null,
    },
    {
      id: 'SW-10470',
      customer: 'Old Customer',
      email: 'old@example.com',
      placedAt: '2026-11-10T10:00:00.000Z',
      status: 'cancelled',
      hasSupportRequest: false,
      total: 100,
      currency: 'INR',
      address: 'Somewhere',
      payment: 'Paid by card',
      items: [],
      supportRequest: null,
    },
  ];
}

function fakeStore(): OrderStore {
  const orders = seed();
  return {
    async list() {
      return orders.slice(0, 2).map(({ items: _i, supportRequest: _s, email: _e, address: _a, payment: _p, ...s }) => s);
    },
    async get(id) {
      return orders.find((o) => o.id === id) ?? null;
    },
    async setStatus(id, status) {
      const o = orders.find((x) => x.id === id);
      if (!o) return 'not-found';
      if (o.status === 'cancelled') return 'cancelled';
      o.status = status;
      return o;
    },
    async cancel(id) {
      const o = orders.find((x) => x.id === id);
      if (!o) return 'not-found';
      o.status = 'cancelled';
      return o;
    },
  };
}

const build = (session: Session | null = admin) =>
  buildApp({ resolveSession: async () => session, orderStore: fakeStore() });

describe('admin orders API', () => {
  it('AC1: lists orders for a signed-in admin, newest first; others are denied', async () => {
    const app = build();
    const res = await app.inject({ method: 'GET', url: '/admin/orders' });
    expect(res.statusCode).toBe(200);
    expect(res.json().orders.map((o: { id: string }) => o.id)).toEqual(['SW-10482', 'SW-10477']);
    const shopperRes = await build(shopper).inject({ method: 'GET', url: '/admin/orders' });
    expect(shopperRes.statusCode).toBe(403);
    expect(shopperRes.body).not.toContain('SW-10482');
    const out = await build(null).inject({ method: 'GET', url: '/admin/orders' });
    expect(out.statusCode).toBe(401);
    expect(out.body).not.toContain('SW-10482');
  });

  it('AC1: the order routes are also gated for status changes and cancel', async () => {
    const app = build(shopper);
    const patch = await app.inject({ method: 'PATCH', url: '/admin/orders/SW-10482/status', payload: { status: 'packed' } });
    const cancel = await app.inject({ method: 'POST', url: '/admin/orders/SW-10482/cancel' });
    expect(patch.statusCode).toBe(403);
    expect(cancel.statusCode).toBe(403);
  });

  it('AC2: returns the full detail; unknown id is 404', async () => {
    const app = build();
    const res = await app.inject({ method: 'GET', url: '/admin/orders/SW-10482' });
    expect(res.json()).toMatchObject({
      id: 'SW-10482',
      email: 'arjun@example.com',
      items: [expect.objectContaining({ name: 'Block-print cotton kurta' }), expect.anything()],
    });
    const missing = await app.inject({ method: 'GET', url: '/admin/orders/nope' });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: 'not_found' });
  });

  it('AC3: returns the support request of an order that has one', async () => {
    const res = await build().inject({ method: 'GET', url: '/admin/orders/SW-10482' });
    expect(res.json().supportRequest).toEqual({
      subject: 'Change delivery address',
      message: expect.stringContaining('office'),
      sentAt: expect.any(String),
    });
  });

  it('AC4: an order without a support request has supportRequest null', async () => {
    const res = await build().inject({ method: 'GET', url: '/admin/orders/SW-10477' });
    expect(res.json().supportRequest).toBeNull();
  });

  it('AC5: sets packed, shipped and delivered; rejects other values; cancelled is final', async () => {
    const app = build();
    for (const status of ['packed', 'shipped', 'delivered']) {
      const res = await app.inject({ method: 'PATCH', url: '/admin/orders/SW-10482/status', payload: { status } });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe(status);
      const again = await app.inject({ method: 'GET', url: '/admin/orders/SW-10482' });
      expect(again.json().status).toBe(status);
    }
    for (const status of ['cancelled', 'lost', undefined]) {
      const bad = await app.inject({ method: 'PATCH', url: '/admin/orders/SW-10482/status', payload: { status } });
      expect(bad.statusCode).toBe(400);
    }
    const cancelledRes = await app.inject({ method: 'PATCH', url: '/admin/orders/SW-10470/status', payload: { status: 'packed' } });
    expect(cancelledRes.statusCode).toBe(409);
    expect(cancelledRes.json()).toEqual({ error: 'order_cancelled' });
    const unknown = await app.inject({ method: 'PATCH', url: '/admin/orders/nope/status', payload: { status: 'packed' } });
    expect(unknown.statusCode).toBe(404);
  });

  it('AC6: cancels an order, and cancelling again does not error', async () => {
    const app = build();
    const res = await app.inject({ method: 'POST', url: '/admin/orders/SW-10477/cancel' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('cancelled');
    const again = await app.inject({ method: 'POST', url: '/admin/orders/SW-10477/cancel' });
    expect(again.statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/admin/orders/nope/cancel' })).statusCode).toBe(404);
  });
});
