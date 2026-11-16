import type { FastifyInstance } from 'fastify';
import type { AppDeps } from '../support/deps.js';
import { validateSupportRequest } from '../support/validate.js';

export function supportRoutes(deps: AppDeps) {
  return async (app: FastifyInstance): Promise<void> => {
    app.post('/support-requests', async (req, reply) => {
      const session = await deps.sessions.resolve(req);
      if (!session) return reply.code(401).send({ error: 'not_signed_in' });

      const checked = validateSupportRequest(req.body);
      if (!checked.ok) {
        return reply.code(400).send({ error: 'invalid_request', fields: checked.fields });
      }

      // Same answer for a missing order and someone else's, so order numbers cannot be probed.
      if (!(await deps.orders.ownsOrder(session.shopperId, checked.value.orderNumber))) {
        return reply.code(422).send({ error: 'order_not_found' });
      }

      const stored = await deps.supportRequests.create({
        shopperId: session.shopperId,
        ...checked.value,
      });
      return reply.code(201).send({ id: stored.id });
    });
  };
}
