import pg from 'pg';
import { loadConfig } from '../config.js';

export function createPool(databaseUrl: string = loadConfig().databaseUrl): pg.Pool {
  return new pg.Pool({ connectionString: databaseUrl });
}
