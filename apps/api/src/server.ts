import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createPool } from './db/pool.js';
import { createPgOrderStore } from './orders/store.js';

const config = loadConfig();
const orderStore = createPgOrderStore(createPool(config.databaseUrl));
const app = buildApp({ orderStore });

app.listen({ port: config.port, host: config.host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
