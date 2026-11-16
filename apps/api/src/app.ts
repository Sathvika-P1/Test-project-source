import Fastify, { type FastifyInstance } from 'fastify';
import type { CatalogueRepository } from './catalogue/repository.js';
import { catalogueRoutes } from './routes/catalogue.js';
import { healthRoutes } from './routes/health.js';

export function buildApp(
  deps: { catalogue?: CatalogueRepository } = {},
): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  app.register(healthRoutes);
  if (deps.catalogue) app.register(catalogueRoutes(deps.catalogue));
  return app;
}
