import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadConfig } from './config.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations');
const client = new pg.Client({ connectionString: loadConfig().databaseUrl });

await client.connect();
try {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    await client.query(await readFile(path.join(dir, file), 'utf8'));
    console.log(`applied ${file}`);
  }
} finally {
  await client.end();
}
