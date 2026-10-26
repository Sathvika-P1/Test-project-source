export interface Config {
  port: number;
  host: string;
  databaseUrl: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT ?? 3000),
    host: env.HOST ?? '0.0.0.0',
    databaseUrl:
      env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/shop',
  };
}
