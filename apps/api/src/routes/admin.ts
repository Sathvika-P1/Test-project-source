import type { FastifyPluginAsync } from 'fastify';
import type { makeGuards } from '../auth/guards.js';

export function adminRoutes(guards: ReturnType<typeof makeGuards>): FastifyPluginAsync {
  return async (app) => {
    app.get('/admin/status', { preHandler: guards.requireAdmin }, async () => ({
      area: 'store-administration',
    }));
  };
}
