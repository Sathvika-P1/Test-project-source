import type { FastifyRequest } from 'fastify';

export type Role = 'admin' | 'shopper';

export interface Session {
  userId: string;
  email: string;
  role: Role;
}

/** Resolves the shopper sign-in session of a request, or null when signed out. */
export type SessionResolver = (req: FastifyRequest) => Promise<Session | null>;

/** Fails closed: until a sign-in is wired in, nobody has a session. */
export const denyAllResolver: SessionResolver = async () => null;

declare module 'fastify' {
  interface FastifyRequest {
    session?: Session;
  }
}
