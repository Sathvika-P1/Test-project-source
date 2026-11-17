export interface Config {
  port: number;
  host: string;
  databaseUrl: string;
  sessionTtlSeconds: number;
  lockoutMaxAttempts: number;
  lockoutSeconds: number;
}

/**
 * Environment (all optional):
 * - SESSION_TTL_SECONDS: fixed session lifetime, default 604800 (7 days)
 * - LOCKOUT_MAX_ATTEMPTS: failed sign-ins per email before lockout, default 5
 * - LOCKOUT_SECONDS: lockout duration, default 900 (15 minutes)
 */
function positiveInt(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${name} must be a positive integer, got "${raw}"`);
  return n;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: positiveInt(env, 'PORT', 3000),
    host: env.HOST ?? '0.0.0.0',
    databaseUrl:
      env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/shop',
    sessionTtlSeconds: positiveInt(env, 'SESSION_TTL_SECONDS', 604800),
    lockoutMaxAttempts: positiveInt(env, 'LOCKOUT_MAX_ATTEMPTS', 5),
    lockoutSeconds: positiveInt(env, 'LOCKOUT_SECONDS', 900),
  };
}
