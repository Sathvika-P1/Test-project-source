export type Role = 'shopper' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
}

export interface AccountSummary {
  bag: { name: string; quantity: number }[];
  saved: { name: string }[];
  orders: { number: string; status: string }[];
}

export interface AuthStore {
  /** Returns null when the email already has an account. */
  createUser(u: { name: string; email: string; passwordHash: string }): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  /** Returns null when the session is unknown or expired. */
  findSession(tokenHash: string, now: Date): Promise<User | null>;
  deleteSession(tokenHash: string): Promise<void>;
  getAttempts(email: string): Promise<{ failedCount: number; lockedUntil: Date | null }>;
  /** Increments the failure count; locks the email until `now + lockoutSeconds` once `maxAttempts` is reached. */
  recordFailure(
    email: string,
    now: Date,
    limits: { maxAttempts: number; lockoutSeconds: number },
  ): Promise<void>;
  clearAttempts(email: string): Promise<void>;
  accountSummary(userId: string): Promise<AccountSummary>;
}
