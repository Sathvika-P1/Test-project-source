import type { FastifyPluginAsync } from 'fastify';
import type { makeGuards } from '../auth/guards.js';
import type { AuthStore } from '../auth/store.js';

export function accountRoutes(store: AuthStore, guards: ReturnType<typeof makeGuards>): FastifyPluginAsync {
  return async (app) => {
    app.get('/account/summary', { preHandler: guards.requireUser }, async (req) =>
      store.accountSummary(req.user!.id),
    );
  };
}
