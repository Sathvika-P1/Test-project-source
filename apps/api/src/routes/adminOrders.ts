import type { FastifyInstance } from 'fastify';
import type { OrderStore } from '../orders/store.js';
import { parseSettableStatus } from '../orders/status.js';

export interface AdminOrdersOptions {
  store: OrderStore;
}

/** Registered inside the gated admin scope: the single requireAdmin hook covers every route here. */
export async function adminOrderRoutes(app: FastifyInstance, opts: AdminOrdersOptions): Promise<void> {
  const { store } = opts;

  app.get('/admin/orders', async () => ({ orders: await store.list() }));

  app.get<{ Params: { id: string } }>('/admin/orders/:id', async (req, reply) => {
    const order = await store.get(req.params.id);
    return order ?? reply.code(404).send({ error: 'not_found' });
  });

  app.patch<{ Params: { id: string }; Body: { status?: unknown } | null }>(
    '/admin/orders/:id/status',
    async (req, reply) => {
      const status = parseSettableStatus(req.body?.status);
      if (!status) return reply.code(400).send({ error: 'invalid_status' });
      const result = await store.setStatus(req.params.id, status);
      if (result === 'not-found') return reply.code(404).send({ error: 'not_found' });
      if (result === 'cancelled') return reply.code(409).send({ error: 'order_cancelled' });
      return result;
    },
  );

  app.post<{ Params: { id: string } }>('/admin/orders/:id/cancel', async (req, reply) => {
    const result = await store.cancel(req.params.id);
    return result === 'not-found' ? reply.code(404).send({ error: 'not_found' }) : result;
  });
}
