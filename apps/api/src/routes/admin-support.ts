import type { FastifyInstance } from 'fastify';
import type { AppDeps } from '../support/deps.js';

export function adminSupportRoutes(deps: AppDeps) {
  return async (app: FastifyInstance): Promise<void> => {
    app.get<{ Params: { orderNumber: string } }>(
      '/admin/orders/:orderNumber/support-requests',
      async (req, reply) => {
        const staff = await deps.staff.resolve(req);
        if (!staff) return reply.code(401).send({ error: 'not_signed_in' });

        const orderNumber = req.params.orderNumber.trim().toUpperCase();
        const found = await deps.supportRequests.listByOrder(orderNumber);
        return reply.send({
          requests: found.map((r) => ({
            id: r.id,
            orderNumber: r.orderNumber,
            topic: r.topic,
            message: r.message,
            shopperId: r.shopperId,
            createdAt: r.createdAt,
          })),
        });
      },
    );
  };
}
