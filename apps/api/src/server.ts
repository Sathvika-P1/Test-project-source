import pg from 'pg';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { PgOrderOwnership } from './support/pg-orders.js';
import { PgSupportRequestStore } from './support/pg-store.js';

const config = loadConfig();
const pool = new pg.Pool({ connectionString: config.databaseUrl });
// The session resolver stays the fail-closed default until sign-in supplies one.
const app = buildApp({
  orders: new PgOrderOwnership(pool),
  supportRequests: new PgSupportRequestStore(pool),
});

app.listen({ port: config.port, host: config.host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
