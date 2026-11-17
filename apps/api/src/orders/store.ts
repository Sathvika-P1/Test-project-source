import type { Pool } from 'pg';
import type { OrderStatus, SettableStatus } from './status.js';

export type { OrderStatus } from './status.js';

export interface OrderSummary {
  id: string;
  customer: string;
  placedAt: string;
  status: OrderStatus;
  hasSupportRequest: boolean;
  total: number;
  currency: string;
}

export interface SupportRequest {
  subject: string;
  message: string;
  sentAt: string;
}

export interface OrderDetail extends OrderSummary {
  email: string;
  address: string;
  payment: string;
  items: { name: string; detail: string; price: number }[];
  supportRequest: SupportRequest | null;
}

export interface OrderStore {
  /** Newest first. */
  list(): Promise<OrderSummary[]>;
  get(id: string): Promise<OrderDetail | null>;
  setStatus(id: string, status: SettableStatus): Promise<OrderDetail | 'not-found' | 'cancelled'>;
  /** Idempotent on an already-cancelled order. */
  cancel(id: string): Promise<OrderDetail | 'not-found'>;
}

interface SummaryRow {
  id: string;
  customer_name: string;
  placed_at: Date;
  status: OrderStatus;
  has_support: boolean;
  total_minor: number;
  currency: string;
}

const SUMMARY_SQL = `
  SELECT o.id, o.customer_name, o.customer_email, o.delivery_address, o.payment_summary,
         o.placed_at, o.status, o.total_minor, o.currency,
         EXISTS (SELECT 1 FROM support_requests s WHERE s.order_id = o.id) AS has_support
  FROM orders o`;

function toSummary(r: SummaryRow): OrderSummary {
  return {
    id: r.id,
    customer: r.customer_name,
    placedAt: r.placed_at.toISOString(),
    status: r.status,
    hasSupportRequest: r.has_support,
    total: r.total_minor / 100,
    currency: r.currency.trim(),
  };
}

/** PostgreSQL-backed store; prices are held in minor units and returned in whole units. */
export function createPgOrderStore(pool: Pick<Pool, 'query'>): OrderStore {
  async function get(id: string): Promise<OrderDetail | null> {
    const { rows } = await pool.query(
      `${SUMMARY_SQL} WHERE o.id = $1`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    const items = await pool.query(
      'SELECT name, detail, price_minor FROM order_items WHERE order_id = $1 ORDER BY position',
      [id],
    );
    const support = await pool.query(
      'SELECT subject, message, created_at FROM support_requests WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
      [id],
    );
    const s = support.rows[0];
    return {
      ...toSummary(row),
      email: row.customer_email,
      address: row.delivery_address,
      payment: row.payment_summary,
      items: items.rows.map((i) => ({ name: i.name, detail: i.detail, price: i.price_minor / 100 })),
      supportRequest: s ? { subject: s.subject, message: s.message, sentAt: s.created_at.toISOString() } : null,
    };
  }

  return {
    async list() {
      const { rows } = await pool.query(`${SUMMARY_SQL} ORDER BY o.placed_at DESC, o.id DESC`);
      return rows.map(toSummary);
    },
    get,
    async setStatus(id, status) {
      // One statement: a concurrent cancel can never be overwritten.
      const upd = await pool.query(
        `UPDATE orders SET status = $2, updated_at = now() WHERE id = $1 AND status <> 'cancelled'`,
        [id, status],
      );
      if (upd.rowCount === 0) {
        const exists = await get(id);
        return exists ? 'cancelled' : 'not-found';
      }
      return (await get(id)) ?? 'not-found';
    },
    async cancel(id) {
      await pool.query(
        `UPDATE orders SET status = 'cancelled', updated_at = now() WHERE id = $1 AND status <> 'cancelled'`,
        [id],
      );
      return (await get(id)) ?? 'not-found';
    },
  };
}
