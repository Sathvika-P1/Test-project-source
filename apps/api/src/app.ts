import Fastify, { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import { denyAllResolver, type SessionResolver } from './auth/session.js';
import { adminRoutes } from './routes/admin.js';
import { healthRoutes } from './routes/health.js';

export interface AppOptions {
  resolveSession?: SessionResolver;
  extraAdminRoutes?: FastifyPluginAsync;
}

export function buildApp(opts: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  app.register(healthRoutes);
  app.register(adminRoutes, {
    resolveSession: opts.resolveSession ?? denyAllResolver,
    extraRoutes: opts.extraAdminRoutes,
  });
  return app;
}
