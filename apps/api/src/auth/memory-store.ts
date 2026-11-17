import { randomUUID } from 'node:crypto';
import type { AccountSummary, AuthStore, Role, User } from './store.js';

/** In-memory AuthStore used by unit tests (no database). */
export class MemoryAuthStore implements AuthStore {
  private users = new Map<string, User>();
  private sessions = new Map<string, { userId: string; expiresAt: Date }>();
  private attempts = new Map<string, { failedCount: number; lockedUntil: Date | null }>();
  private data = new Map<string, AccountSummary>();

  async createUser(u: { name: string; email: string; passwordHash: string }) {
    if ([...this.users.values()].some((x) => x.email === u.email)) return null;
    const user: User = { id: randomUUID(), role: 'shopper', ...u };
    this.users.set(user.id, user);
    return user;
  }
  async findUserByEmail(email: string) {
    return [...this.users.values()].find((x) => x.email === email) ?? null;
  }
  async createSession(userId: string, tokenHash: string, expiresAt: Date) {
    this.sessions.set(tokenHash, { userId, expiresAt });
  }
  async findSession(tokenHash: string, now: Date) {
    const s = this.sessions.get(tokenHash);
    if (!s || s.expiresAt <= now) return null;
    return this.users.get(s.userId) ?? null;
  }
  async deleteSession(tokenHash: string) {
    this.sessions.delete(tokenHash);
  }
  async getAttempts(email: string) {
    return this.attempts.get(email) ?? { failedCount: 0, lockedUntil: null };
  }
  async recordFailure(email: string, now: Date, limits: { maxAttempts: number; lockoutSeconds: number }) {
    const failedCount = (this.attempts.get(email)?.failedCount ?? 0) + 1;
    const lockedUntil =
      failedCount >= limits.maxAttempts ? new Date(now.getTime() + limits.lockoutSeconds * 1000) : null;
    this.attempts.set(email, { failedCount, lockedUntil });
  }
  async clearAttempts(email: string) {
    this.attempts.delete(email);
  }
  async accountSummary(userId: string): Promise<AccountSummary> {
    return this.data.get(userId) ?? { bag: [], saved: [], orders: [] };
  }

  /** Test helpers. */
  setRole(email: string, role: Role) {
    for (const u of this.users.values()) if (u.email === email) u.role = role;
  }
  seed(userId: string, summary: AccountSummary) {
    this.data.set(userId, summary);
  }
}
