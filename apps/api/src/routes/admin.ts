import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { requireAdmin } from '../auth/requireAdmin.js';
import type { SessionResolver } from '../auth/session.js';
import type { CatalogStore } from '../catalog/store.js';
import { adminCatalogRoutes } from './adminCatalog.js';

export interface AdminRoutesOptions {
  resolveSession: SessionResolver;
  /** Extra routes registered inside the gated scope (used by tests and future admin features). */
  extraRoutes?: FastifyPluginAsync;
  catalog?: CatalogStore;
}

/** Every route registered here is behind the one admin-role hook. */
export async function adminRoutes(app: FastifyInstance, opts: AdminRoutesOptions): Promise<void> {
  app.addHook('preHandler', requireAdmin(opts.resolveSession));

  app.get('/admin/access', async (req) => ({ role: 'admin', email: req.session?.email }));

  if (opts.catalog) {
    await app.register(adminCatalogRoutes(opts.catalog));
  }

  if (opts.extraRoutes) {
    await app.register(opts.extraRoutes);
  }
}
