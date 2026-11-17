import type { FastifyReply, FastifyRequest } from 'fastify';
import { SESSION_COOKIE, parseCookies } from './cookies.js';
import type { AuthService } from './service.js';
import type { User } from './store.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}

export const ADMIN_REFUSED = 'You do not have access to store administration.';

export function makeGuards(auth: AuthService) {
  const requireUser = async (req: FastifyRequest, reply: FastifyReply) => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    const user = await auth.currentUser(token);
    if (!user) return reply.code(401).send({ message: 'Sign in to continue.' });
    req.user = user;
  };
  const requireAdmin = async (req: FastifyRequest, reply: FastifyReply) => {
    const denied = await requireUser(req, reply);
    if (denied) return denied;
    if (req.user?.role !== 'admin') return reply.code(403).send({ message: ADMIN_REFUSED });
  };
  return { requireUser, requireAdmin };
}
