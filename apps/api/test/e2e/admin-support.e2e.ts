import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';

describe('GET /admin/orders/:orderNumber/support-requests', () => {
  const staffApp = buildApp({
    staff: { resolve: async () => ({ staffId: 'staff-1' }) },
    supportRequests: {
      create: async () => {
        throw new Error('unused');
      },
      listByOrder: async (orderNumber) => [
        {
          id: '1',
          shopperId: 'shopper-1',
          orderNumber,
          topic: 'Other',
          message: 'Where is it?',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
  });
  const signedOut = buildApp();

  beforeAll(async () => {
    await staffApp.ready();
    await signedOut.ready();
  });
  afterAll(async () => {
    await staffApp.close();
    await signedOut.close();
  });

  it('lists requests for staff', async () => {
    const res = await request(staffApp.server).get('/admin/orders/sw-1001/support-requests');
    expect(res.status).toBe(200);
    expect(res.body.requests[0]).toMatchObject({ orderNumber: 'SW-1001', message: 'Where is it?' });
  });

  it('refuses without a staff session', async () => {
    const res = await request(signedOut.server).get('/admin/orders/SW-1001/support-requests');
    expect(res.status).toBe(401);
  });
});
