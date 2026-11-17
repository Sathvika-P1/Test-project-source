import type { preHandlerAsyncHookHandler } from 'fastify';
import type { SessionResolver } from './session.js';

/** Single-role guard: only a signed-in admin passes; anything else (or a resolver failure) is denied. */
export function requireAdmin(resolve: SessionResolver): preHandlerAsyncHookHandler {
  return async (req, reply) => {
    let session;
    try {
      session = await resolve(req);
    } catch {
      return reply.code(401).send({ error: 'unauthenticated' });
    }
    if (!session) {
      return reply.code(401).send({ error: 'unauthenticated' });
    }
    if (session.role !== 'admin') {
      return reply.code(403).send({ error: 'forbidden' });
    }
    req.session = session;
  };
}
