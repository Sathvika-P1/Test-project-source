import Fastify, { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import { denyAllResolver, type SessionResolver } from './auth/session.js';
import type { OrderStore } from './orders/store.js';
import { adminRoutes } from './routes/admin.js';
import { healthRoutes } from './routes/health.js';

export interface AppOptions {
  resolveSession?: SessionResolver;
  extraAdminRoutes?: FastifyPluginAsync;
  /** Order storage; without one no order routes are registered. */
  orderStore?: OrderStore;
}

export function buildApp(opts: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  app.register(healthRoutes);
  app.register(adminRoutes, {
    resolveSession: opts.resolveSession ?? denyAllResolver,
    extraRoutes: opts.extraAdminRoutes,
    orderStore: opts.orderStore,
  });
  return app;
}
