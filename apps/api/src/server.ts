import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createPool } from './db/pool.js';
import { pgProductStore } from './products/pgStore.js';

const config = loadConfig();
const app = buildApp({ productStore: pgProductStore(createPool(config.databaseUrl)) });

app.listen({ port: config.port, host: config.host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
