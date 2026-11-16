import type { Pool } from 'pg';
import type {
  NewSupportRequest,
  StoredSupportRequest,
  SupportRequestForStaff,
  SupportRequestStore,
} from './store.js';

export class PgSupportRequestStore implements SupportRequestStore {
  constructor(private readonly db: { query: Pool['query'] }) {}

  async create(input: NewSupportRequest): Promise<StoredSupportRequest> {
    const res = await this.db.query(
      'INSERT INTO support_requests (shopper_id, order_number, topic, message) VALUES ($1, $2, $3, $4) RETURNING id',
      [input.shopperId, input.orderNumber, input.topic, input.message],
    );
    return { ...input, id: String(res.rows[0].id) };
  }

  async listByOrder(orderNumber: string): Promise<SupportRequestForStaff[]> {
    const res = await this.db.query(
      'SELECT id, shopper_id, order_number, topic, message, created_at FROM support_requests WHERE order_number = $1 ORDER BY created_at DESC, id DESC',
      [orderNumber],
    );
    return res.rows.map((r) => ({
      id: String(r.id),
      shopperId: r.shopper_id,
      orderNumber: r.order_number,
      topic: r.topic,
      message: r.message,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }
}
