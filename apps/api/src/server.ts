import { buildApp } from './app.js';
import { PgAuthStore } from './auth/pg-store.js';
import { loadConfig } from './config.js';
import { createPool } from './db/pool.js';

const config = loadConfig();
const pool = createPool(config.databaseUrl);
const app = buildApp({ store: new PgAuthStore(pool), config });
app.addHook('onClose', async () => {
  await pool.end();
});

app.listen({ port: config.port, host: config.host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
