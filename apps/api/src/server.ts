import { buildApp } from './app.js';
import { createPgCatalogStore } from './catalog/pgStore.js';
import { loadConfig } from './config.js';
import { createPool } from './db/pool.js';

const config = loadConfig();
const app = buildApp({ catalog: createPgCatalogStore(createPool(config.databaseUrl)) });

app.listen({ port: config.port, host: config.host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
