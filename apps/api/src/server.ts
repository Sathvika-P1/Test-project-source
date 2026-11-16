import pg from 'pg';
import { buildApp } from './app.js';
import { createPgRepository } from './catalogue/repository.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const pool = new pg.Pool({ connectionString: config.databaseUrl });
const app = buildApp({ catalogue: createPgRepository(pool) });

app.listen({ port: config.port, host: config.host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
