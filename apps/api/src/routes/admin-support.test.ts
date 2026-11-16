import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../app.js';
import type {
  NewSupportRequest,
  SupportRequestForStaff,
  SupportRequestStore,
} from '../support/store.js';

const staff = { resolve: async () => ({ staffId: 'staff-1' }) };

function row(id: string, orderNumber: string, message = 'Where is it?'): SupportRequestForStaff {
  return {
    id,
    shopperId: 'shopper-1',
    orderNumber,
    topic: 'Other',
    message,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function memoryStore(): SupportRequestStore & { rows: SupportRequestForStaff[] } {
  const rows: SupportRequestForStaff[] = [];
  return {
    rows,
    create: async (input: NewSupportRequest) => {
      const stored = { ...input, id: String(rows.length + 1), createdAt: 'now' };
      rows.push(stored);
      return stored;
    },
    listByOrder: async (orderNumber) => rows.filter((r) => r.orderNumber === orderNumber).reverse(),
  };
}

const url = '/admin/orders/SW-1001/support-requests';

describe('GET /admin/orders/:orderNumber/support-requests', () => {
  it('shows the request for that order (AC1) with order number, topic and message (AC2)', async () => {
    const listByOrder = vi.fn(async (n: string) => [row('1', n), row('9', 'SW-2000')].filter((r) => r.orderNumber === n));
    const app = buildApp({
      staff,
      supportRequests: { create: vi.fn(), listByOrder },
    });
    const res = await app.inject({ method: 'GET', url });
    expect(res.statusCode).toBe(200);
    expect(res.json().requests).toHaveLength(1);
    expect(res.json().requests[0].orderNumber).toBe('SW-1001');
    expect(res.json().requests[0]).toMatchObject({
      orderNumber: 'SW-1001',
      topic: 'Other',
      message: 'Where is it?',
      shopperId: 'shopper-1',
    });
  });

  it('normalises the order number param', async () => {
    const listByOrder = vi.fn(async () => []);
    const app = buildApp({ staff, supportRequests: { create: vi.fn(), listByOrder } });
    await app.inject({ method: 'GET', url: '/admin/orders/%20sw-1001%20/support-requests' });
    expect(listByOrder).toHaveBeenCalledWith('SW-1001');
  });

  it('shows both requests for one order (AC4)', async () => {
    const app = buildApp({
      staff,
      supportRequests: {
        create: vi.fn(),
        listByOrder: async () => [row('2', 'SW-1001'), row('1', 'SW-1001')],
      },
    });
    const res = await app.inject({ method: 'GET', url });
    expect(res.json().requests.map((r: { id: string }) => r.id)).toEqual(['2', '1']);
  });

  it('never shows a request that failed validation (AC3)', async () => {
    const store = memoryStore();
    const app = buildApp({
      staff,
      sessions: { resolve: async () => ({ shopperId: 'shopper-1' }) },
      orders: { ownsOrder: async () => true },
      supportRequests: store,
    });
    const post = await app.inject({
      method: 'POST',
      url: '/support-requests',
      payload: { topic: 'Other', orderNumber: 'SW-1001', message: '  ' },
    });
    expect(post.statusCode).toBe(400);
    const res = await app.inject({ method: 'GET', url });
    expect(res.statusCode).toBe(200);
    expect(res.json().requests).toEqual([]);
  });

  it('returns 401 without a staff session', async () => {
    const app = buildApp({ staff: { resolve: async () => null } });
    expect((await app.inject({ method: 'GET', url })).statusCode).toBe(401);
  });

  it('returns 401 with buildApp() defaults', async () => {
    expect((await buildApp().inject({ method: 'GET', url })).statusCode).toBe(401);
  });
});
