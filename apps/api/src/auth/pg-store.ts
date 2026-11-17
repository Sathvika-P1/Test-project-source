import type pg from 'pg';
import type { AccountSummary, AuthStore, Role, User } from './store.js';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
}

const toUser = (r: UserRow): User => ({
  id: r.id,
  name: r.name,
  email: r.email,
  passwordHash: r.password_hash,
  role: r.role,
});

export class PgAuthStore implements AuthStore {
  constructor(private pool: pg.Pool) {}

  async createUser(u: { name: string; email: string; passwordHash: string }) {
    const { rows } = await this.pool.query<UserRow>(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING RETURNING *`,
      [u.name, u.email, u.passwordHash],
    );
    return rows[0] ? toUser(rows[0]) : null;
  }
  async findUserByEmail(email: string) {
    const { rows } = await this.pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] ? toUser(rows[0]) : null;
  }
  async createSession(userId: string, tokenHash: string, expiresAt: Date) {
    await this.pool.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [
      tokenHash,
      userId,
      expiresAt,
    ]);
  }
  async findSession(tokenHash: string, now: Date) {
    const { rows } = await this.pool.query<UserRow>(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > $2`,
      [tokenHash, now],
    );
    return rows[0] ? toUser(rows[0]) : null;
  }
  async deleteSession(tokenHash: string) {
    await this.pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  }
  // One statement: the row lock taken by ON CONFLICT DO UPDATE serialises concurrent attempts, and the
  // WHERE clause yields no row (refused) while a lock is still active.
  async reserveAttempt(email: string, now: Date, limits: { maxAttempts: number; lockoutSeconds: number }) {
    const { rowCount } = await this.pool.query(
      `INSERT INTO login_attempts AS la (email, failed_count, locked_until)
       VALUES ($1, 1, CASE WHEN 1 >= $2 THEN $3::timestamptz + make_interval(secs => $4) END)
       ON CONFLICT (email) DO UPDATE SET
         failed_count = CASE WHEN la.locked_until IS NULL THEN la.failed_count + 1 ELSE 1 END,
         locked_until = CASE WHEN (CASE WHEN la.locked_until IS NULL THEN la.failed_count + 1 ELSE 1 END) >= $2
                             THEN $3::timestamptz + make_interval(secs => $4) END
       WHERE la.locked_until IS NULL OR la.locked_until <= $3::timestamptz`,
      [email, limits.maxAttempts, now, limits.lockoutSeconds],
    );
    return (rowCount ?? 0) > 0;
  }
  async clearAttempts(email: string) {
    await this.pool.query('DELETE FROM login_attempts WHERE email = $1', [email]);
  }
  async accountSummary(userId: string): Promise<AccountSummary> {
    const [bag, saved, orders] = await Promise.all([
      this.pool.query<{ name: string; quantity: number }>('SELECT name, quantity FROM bag_items WHERE user_id = $1 ORDER BY name', [userId]),
      this.pool.query<{ name: string }>('SELECT name FROM saved_items WHERE user_id = $1 ORDER BY name', [userId]),
      this.pool.query<{ number: string; status: string }>('SELECT number, status FROM orders WHERE user_id = $1 ORDER BY number DESC', [userId]),
    ]);
    return { bag: bag.rows, saved: saved.rows, orders: orders.rows };
  }
}
