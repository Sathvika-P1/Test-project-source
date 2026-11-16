import Fastify, { type FastifyInstance } from 'fastify';
import { healthRoutes } from './routes/health.js';
import { adminSupportRoutes } from './routes/admin-support.js';
import { supportRoutes } from './routes/support.js';
import { defaultDeps, type AppDeps } from './support/deps.js';

export function buildApp(deps: Partial<AppDeps> = {}): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  app.register(healthRoutes);
  const all = { ...defaultDeps(), ...deps };
  app.register(supportRoutes(all));
  app.register(adminSupportRoutes(all));
  return app;
}
