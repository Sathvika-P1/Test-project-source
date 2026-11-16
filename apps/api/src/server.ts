import pg from 'pg';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { PgOrderOwnership } from './support/pg-orders.js';
import { PgSupportRequestStore } from './support/pg-store.js';

const config = loadConfig();
const pool = new pg.Pool({ connectionString: config.databaseUrl });
// The session and staff resolvers stay the fail-closed defaults until sign-in and
// Store administration supply them.
const app = buildApp({
  orders: new PgOrderOwnership(pool),
  supportRequests: new PgSupportRequestStore(pool),
});

app.listen({ port: config.port, host: config.host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
