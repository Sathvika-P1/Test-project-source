import type { Pool } from 'pg';
import type { OrderOwnership } from './deps.js';

export class PgOrderOwnership implements OrderOwnership {
  constructor(private readonly db: { query: Pool['query'] }) {}

  async ownsOrder(shopperId: string, orderNumber: string): Promise<boolean> {
    const res = await this.db.query(
      'SELECT 1 FROM orders WHERE order_number = $1 AND customer_id = $2',
      [orderNumber, shopperId],
    );
    return (res.rowCount ?? 0) > 0;
  }
}
