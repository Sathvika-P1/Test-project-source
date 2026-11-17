import { createHash, randomBytes } from 'node:crypto';
import type { Config } from '../config.js';
import { hashPassword, verifyPassword } from './password.js';
import type { AuthStore, User } from './store.js';
import { normalizeEmail, validateRegistration, type FieldErrors } from './validation.js';

export const GENERIC_SIGN_IN_ERROR = 'Email or password is incorrect. Check both and try again.';
export const LOCKED_MESSAGE = 'Too many failed attempts. Try again in 15 minutes.';
export const GENERIC_REGISTER_ERROR =
  'We could not create an account with these details. Try different details or sign in.';

export type PublicUser = Pick<User, 'id' | 'name' | 'email' | 'role'>;

export function toPublic(u: User): PublicUser {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

export type AuthResult =
  | { ok: true; user: PublicUser; token: string }
  | { ok: false; status: 400; fieldErrors: FieldErrors; message: string }
  | { ok: false; status: 401 | 409 | 429; message: string };

export const hashToken = (token: string) => createHash('sha256').update(token).digest('base64url');

type Limits = Pick<Config, 'sessionTtlSeconds' | 'lockoutMaxAttempts' | 'lockoutSeconds'>;

export function createAuthService(store: AuthStore, now: () => Date, limits: Limits) {
  // Verified against when the email is unknown so both failures cost the same time.
  const dummyHash = hashPassword('not-a-real-password');

  async function startSession(user: User) {
    const token = randomBytes(32).toString('base64url');
    await store.createSession(user.id, hashToken(token), new Date(now().getTime() + limits.sessionTtlSeconds * 1000));
    return token;
  }

  return {
    async register(input: { name?: unknown; email?: unknown; password?: unknown }): Promise<AuthResult> {
      const str = (v: unknown) => (typeof v === 'string' ? v : '');
      const clean = { name: str(input.name), email: str(input.email), password: str(input.password) };
      const fieldErrors = validateRegistration(clean);
      if (Object.keys(fieldErrors).length > 0) {
        return { ok: false, status: 400, fieldErrors, message: 'Fix the highlighted fields and try again.' };
      }
      const user = await store.createUser({
        name: clean.name.trim(),
        email: normalizeEmail(clean.email),
        passwordHash: await hashPassword(clean.password),
      });
      if (!user) return { ok: false, status: 409, message: GENERIC_REGISTER_ERROR };
      return { ok: true, user: toPublic(user), token: await startSession(user) };
    },

    async signIn(input: { email?: unknown; password?: unknown }): Promise<AuthResult> {
      const email = normalizeEmail(typeof input.email === 'string' ? input.email : '');
      const password = typeof input.password === 'string' ? input.password : '';
      // Reserve the attempt atomically before the slow verify so parallel guesses cannot all slip past.
      const allowed = await store.reserveAttempt(email, now(), {
        maxAttempts: limits.lockoutMaxAttempts,
        lockoutSeconds: limits.lockoutSeconds,
      });
      if (!allowed) return { ok: false, status: 429, message: LOCKED_MESSAGE };
      const user = await store.findUserByEmail(email);
      const valid = await verifyPassword(password, user ? user.passwordHash : await dummyHash);
      if (!user || !valid) return { ok: false, status: 401, message: GENERIC_SIGN_IN_ERROR };
      await store.clearAttempts(email);
      return { ok: true, user: toPublic(user), token: await startSession(user) };
    },

    signOut: (token: string) => store.deleteSession(hashToken(token)),

    async currentUser(token: string | undefined): Promise<User | null> {
      if (!token) return null;
      return store.findSession(hashToken(token), now());
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
