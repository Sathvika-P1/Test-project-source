import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { requireAdmin } from '../auth/requireAdmin.js';
import type { SessionResolver } from '../auth/session.js';
import type { ProductStore } from '../products/types.js';
import { adminProductRoutes } from './adminProducts.js';

export interface AdminRoutesOptions {
  resolveSession: SessionResolver;
  productStore: ProductStore;
  /** Extra routes registered inside the gated scope (used by tests and future admin features). */
  extraRoutes?: FastifyPluginAsync;
}

/** Every route registered here is behind the one admin-role hook. */
export async function adminRoutes(app: FastifyInstance, opts: AdminRoutesOptions): Promise<void> {
  app.addHook('preHandler', requireAdmin(opts.resolveSession));

  app.get('/admin/access', async (req) => ({ role: 'admin', email: req.session?.email }));

  await app.register(adminProductRoutes, { productStore: opts.productStore });

  if (opts.extraRoutes) {
    await app.register(opts.extraRoutes);
  }
}
