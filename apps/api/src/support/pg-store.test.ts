import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { PgSupportRequestStore } from './pg-store.js';

describe('PgSupportRequestStore', () => {
  it('inserts with parameters, not interpolated values', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: '7' }] });
    const store = new PgSupportRequestStore({ query: query as unknown as Pool['query'] });
    const stored = await store.create({
      shopperId: 'shopper-1',
      orderNumber: 'SW-10482',
      topic: 'Other',
      message: "it's broken",
    });
    const [sql, values] = query.mock.calls[0];
    expect(sql).toContain('INSERT INTO support_requests');
    expect(sql).not.toContain('SW-10482');
    expect(sql).not.toContain("it's broken");
    expect(values).toEqual(['shopper-1', 'SW-10482', 'Other', "it's broken"]);
    expect(stored.id).toBe('7');
  });

  it('lists by order with a parameterised, newest-first query and maps rows', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 2,
          shopper_id: 's1',
          order_number: 'SW-1001',
          topic: 'Other',
          message: 'm',
          created_at: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
    });
    const store = new PgSupportRequestStore({ query: query as unknown as Pool['query'] });
    const list = await store.listByOrder('SW-1001');
    const [sql, values] = query.mock.calls[0];
    expect(sql).not.toContain('SW-1001');
    expect(sql).toContain('ORDER BY created_at DESC');
    expect(values).toEqual(['SW-1001']);
    expect(list).toEqual([
      {
        id: '2',
        shopperId: 's1',
        orderNumber: 'SW-1001',
        topic: 'Other',
        message: 'm',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });
});
