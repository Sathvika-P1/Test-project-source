import type { Pool } from 'pg';
import type { NewSupportRequest, StoredSupportRequest, SupportRequestStore } from './store.js';

export class PgSupportRequestStore implements SupportRequestStore {
  constructor(private readonly db: { query: Pool['query'] }) {}

  async create(input: NewSupportRequest): Promise<StoredSupportRequest> {
    const res = await this.db.query(
      'INSERT INTO support_requests (shopper_id, order_number, topic, message) VALUES ($1, $2, $3, $4) RETURNING id',
      [input.shopperId, input.orderNumber, input.topic, input.message],
    );
    return { ...input, id: String(res.rows[0].id) };
  }
}
