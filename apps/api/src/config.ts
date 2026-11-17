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
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT ?? 3000),
    host: env.HOST ?? '0.0.0.0',
    databaseUrl:
      env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/shop',
    sessionTtlSeconds: Number(env.SESSION_TTL_SECONDS ?? 604800),
    lockoutMaxAttempts: Number(env.LOCKOUT_MAX_ATTEMPTS ?? 5),
    lockoutSeconds: Number(env.LOCKOUT_SECONDS ?? 900),
  };
}
