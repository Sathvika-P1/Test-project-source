import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';
import type { NewSupportRequest } from '../../src/support/store.js';

const body = {
  topic: 'Wrong or damaged item',
  orderNumber: ' sw-10482 ',
  message: 'The mug arrived chipped.',
};

describe('POST /support-requests', () => {
  const created: NewSupportRequest[] = [];
  const signedIn = buildApp({
    sessions: { resolve: async () => ({ shopperId: 'shopper-1' }) },
    orders: { ownsOrder: async (_shopper, number) => number === 'SW-10482' },
    supportRequests: {
      create: async (input) => {
        created.push(input);
        return { ...input, id: '1' };
      },
      listByOrder: async () => [],
    },
  });
  const signedOut = buildApp();

  beforeAll(async () => {
    await signedIn.ready();
    await signedOut.ready();
  });
  afterAll(async () => {
    await signedIn.close();
    await signedOut.close();
  });

  it('stores a valid request', async () => {
    const res = await request(signedIn.server).post('/support-requests').send(body);
    expect(res.status).toBe(201);
    expect(created).toEqual([
      { shopperId: 'shopper-1', orderNumber: 'SW-10482', topic: body.topic, message: body.message },
    ]);
  });

  it('refuses when signed out', async () => {
    const res = await request(signedOut.server).post('/support-requests').send(body);
    expect(res.status).toBe(401);
  });
});
