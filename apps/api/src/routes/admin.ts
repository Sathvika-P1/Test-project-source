import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { requireAdmin } from '../auth/requireAdmin.js';
import type { SessionResolver } from '../auth/session.js';
import type { OrderStore } from '../orders/store.js';
import { adminOrderRoutes } from './adminOrders.js';

export interface AdminRoutesOptions {
  resolveSession: SessionResolver;
  /** Extra routes registered inside the gated scope (used by tests and future admin features). */
  extraRoutes?: FastifyPluginAsync;
  /** When set, the order management routes are registered in the gated scope. */
  orderStore?: OrderStore;
}

/** Every route registered here is behind the one admin-role hook. */
export async function adminRoutes(app: FastifyInstance, opts: AdminRoutesOptions): Promise<void> {
  app.addHook('preHandler', requireAdmin(opts.resolveSession));

  app.get('/admin/access', async (req) => ({ role: 'admin', email: req.session?.email }));

  if (opts.orderStore) {
    await app.register(adminOrderRoutes, { store: opts.orderStore });
  }

  if (opts.extraRoutes) {
    await app.register(opts.extraRoutes);
  }
}
