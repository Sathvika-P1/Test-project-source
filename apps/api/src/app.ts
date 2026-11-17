import Fastify, { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import { denyAllResolver, type SessionResolver } from './auth/session.js';
import { createMemoryCatalogStore } from './catalog/memoryStore.js';
import type { CatalogStore } from './catalog/store.js';
import { adminRoutes } from './routes/admin.js';
import { categoryRoutes } from './routes/categories.js';
import { healthRoutes } from './routes/health.js';

export interface AppOptions {
  resolveSession?: SessionResolver;
  extraAdminRoutes?: FastifyPluginAsync;
  /** Defaults to an in-memory store with the fixed top-level categories and no sub-categories. */
  catalog?: CatalogStore;
}

export function buildApp(opts: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  const catalog = opts.catalog ?? createMemoryCatalogStore();
  app.register(healthRoutes);
  app.register(categoryRoutes(catalog));
  app.register(adminRoutes, {
    resolveSession: opts.resolveSession ?? denyAllResolver,
    extraRoutes: opts.extraAdminRoutes,
    catalog,
  });
  return app;
}
