import type { FastifyRequest } from 'fastify';
import type { SupportRequestStore } from './store.js';

export interface SessionResolver {
  resolve(req: FastifyRequest): Promise<{ shopperId: string } | null>;
}

export interface OrderOwnership {
  ownsOrder(shopperId: string, orderNumber: string): Promise<boolean>;
}

export interface AppDeps {
  sessions: SessionResolver;
  orders: OrderOwnership;
  supportRequests: SupportRequestStore;
}

/** Fail-closed defaults: nobody is signed in, no order is owned, nothing is stored. */
export function defaultDeps(): AppDeps {
  return {
    sessions: { resolve: async () => null },
    orders: { ownsOrder: async () => false },
    supportRequests: {
      create: async () => {
        throw new Error('no support request store configured');
      },
    },
  };
}
