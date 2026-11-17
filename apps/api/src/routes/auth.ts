import type { FastifyPluginAsync } from 'fastify';
import { SESSION_COOKIE, clearSessionCookie, parseCookies, sessionCookie } from '../auth/cookies.js';
import { toPublic, type AuthResult, type AuthService } from '../auth/service.js';
import type { Config } from '../config.js';
import type { makeGuards } from '../auth/guards.js';

export function authRoutes(
  auth: AuthService,
  config: Config,
  guards: ReturnType<typeof makeGuards>,
): FastifyPluginAsync {
  return async (app) => {
    const respond = (reply: import('fastify').FastifyReply, result: AuthResult, okStatus: number) => {
      if (!result.ok) {
        const body = 'fieldErrors' in result ? { message: result.message, fieldErrors: result.fieldErrors } : { message: result.message };
        return reply.code(result.status).send(body);
      }
      reply.header('set-cookie', sessionCookie(result.token, config.sessionTtlSeconds));
      return reply.code(okStatus).send({ user: result.user });
    };

    app.post('/auth/register', async (req, reply) =>
      respond(reply, await auth.register((req.body ?? {}) as { name?: unknown; email?: unknown; password?: unknown }), 201),
    );
    app.post('/auth/sign-in', async (req, reply) =>
      respond(reply, await auth.signIn((req.body ?? {}) as { name?: unknown; email?: unknown; password?: unknown }), 200),
    );
    app.post('/auth/sign-out', async (req, reply) => {
      const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
      if (token) await auth.signOut(token);
      return reply.header('set-cookie', clearSessionCookie()).code(204).send();
    });
    app.get('/auth/me', { preHandler: guards.requireUser }, async (req) => ({ user: toPublic(req.user!) }));
  };
}
