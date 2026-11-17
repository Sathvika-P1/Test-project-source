import pg from 'pg';

/** Builds a connection pool for the PostgreSQL database at `databaseUrl`. */
export function createPool(databaseUrl: string): pg.Pool {
  return new pg.Pool({ connectionString: databaseUrl });
}
