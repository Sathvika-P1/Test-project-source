import { buildApp } from './app.js';
import { PgAuthStore } from './auth/pg-store.js';
import { loadConfig } from './config.js';
import { createPool } from './db/pool.js';

const config = loadConfig();
const pool = createPool(config.databaseUrl);
const store = new PgAuthStore(pool);
const app = buildApp({ store, config });
const purge = setInterval(() => {
  store.purgeExpired(new Date()).catch((err) => app.log.error(err));
}, 10 * 60 * 1000);
purge.unref();
app.addHook('onClose', async () => {
  clearInterval(purge);
  await pool.end();
});

app.listen({ port: config.port, host: config.host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
