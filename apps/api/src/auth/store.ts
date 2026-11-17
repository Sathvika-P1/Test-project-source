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
  /**
   * Atomically reserves one sign-in attempt BEFORE the password is verified.
   * Returns false (and counts nothing) while the email is locked. A lapsed lock restarts the count.
   * The reservation that reaches `maxAttempts` locks the email until `now + lockoutSeconds`.
   * A successful sign-in releases the reservations with `clearAttempts`.
   */
  reserveAttempt(
    email: string,
    now: Date,
    limits: { maxAttempts: number; lockoutSeconds: number },
  ): Promise<boolean>;
  clearAttempts(email: string): Promise<void>;
  accountSummary(userId: string): Promise<AccountSummary>;
}
