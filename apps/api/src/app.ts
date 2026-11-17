import Fastify, { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import { denyAllResolver, type SessionResolver } from './auth/session.js';
import { memoryProductStore } from './products/memoryStore.js';
import type { ProductStore } from './products/types.js';
import { adminRoutes } from './routes/admin.js';
import { catalogueRoutes } from './routes/catalogue.js';
import { healthRoutes } from './routes/health.js';

export interface AppOptions {
  resolveSession?: SessionResolver;
  extraAdminRoutes?: FastifyPluginAsync;
  /** Defaults to an in-memory store (tests only); server.ts always passes the pg store. */
  productStore?: ProductStore;
}

export function buildApp(opts: AppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
    // Reject unknown body fields (stock, discounts) instead of silently stripping them.
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
  });
  const productStore = opts.productStore ?? memoryProductStore();
  app.register(healthRoutes);
  app.register(catalogueRoutes, { productStore });
  app.register(adminRoutes, {
    resolveSession: opts.resolveSession ?? denyAllResolver,
    productStore,
    extraRoutes: opts.extraAdminRoutes,
  });
  return app;
}
