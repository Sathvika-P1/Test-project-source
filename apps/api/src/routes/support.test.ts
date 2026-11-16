import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../app.js';
import type { NewSupportRequest, SupportRequestStore } from '../support/store.js';

const valid = {
  topic: 'Wrong or damaged item',
  orderNumber: 'SW-10482',
  message: 'The mug arrived chipped.',
};

function setup(opts: { signedIn?: boolean; owns?: boolean } = {}) {
  const { signedIn = true, owns = true } = opts;
  const created: NewSupportRequest[] = [];
  const supportRequests: SupportRequestStore = {
    create: async (input) => {
      created.push(input);
      return { ...input, id: '1' };
    },
    listByOrder: async () => [],
  };
  const ownsOrder = vi.fn(async () => owns);
  const app = buildApp({
    sessions: { resolve: async () => (signedIn ? { shopperId: 'shopper-1' } : null) },
    orders: { ownsOrder },
    supportRequests,
  });
  return { app, created, ownsOrder };
}

const post = (app: ReturnType<typeof buildApp>, payload: object) =>
  app.inject({ method: 'POST', url: '/support-requests', payload });

describe('POST /support-requests', () => {
  it.each(['topic', 'orderNumber', 'message'])('refuses an empty %s', async (field) => {
    const { app, created } = setup();
    const res = await post(app, { ...valid, [field]: '   ' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'invalid_request', fields: [field] });
    expect(created).toHaveLength(0);
  });

  it('refuses a shopper who is not signed in', async () => {
    const { app, created } = setup({ signedIn: false });
    const res = await post(app, valid);
    expect(res.statusCode).toBe(401);
    expect(created).toHaveLength(0);
  });

  it('fails closed with no deps', async () => {
    const res = await post(buildApp(), valid);
    expect(res.statusCode).toBe(401);
  });

  it("refuses an order that is not the shopper's own", async () => {
    const { app, created, ownsOrder } = setup({ owns: false });
    const res = await post(app, { ...valid, orderNumber: 'SW-10099' });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ error: 'order_not_found' });
    expect(created).toHaveLength(0);
    expect(ownsOrder).toHaveBeenCalledWith('shopper-1', 'SW-10099');
  });

  it('stores a valid request for an owned order', async () => {
    const { app, created } = setup();
    const res = await post(app, { ...valid, orderNumber: ' sw-10482 ' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ id: '1' });
    expect(created).toEqual([{ shopperId: 'shopper-1', ...valid }]);
  });
});
