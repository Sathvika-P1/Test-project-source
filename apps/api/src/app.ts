import Fastify, { type FastifyInstance } from 'fastify';
import { makeGuards } from './auth/guards.js';
import { MemoryAuthStore } from './auth/memory-store.js';
import { createAuthService } from './auth/service.js';
import type { AuthStore } from './auth/store.js';
import { loadConfig, type Config } from './config.js';
import { accountRoutes } from './routes/account.js';
import { adminRoutes } from './routes/admin.js';
import { authRoutes } from './routes/auth.js';
import { healthRoutes } from './routes/health.js';

export interface AppDeps {
  store: AuthStore;
  now: () => Date;
  config: Config;
}

export function buildApp(deps: Partial<AppDeps> = {}): FastifyInstance {
  const store = deps.store ?? new MemoryAuthStore();
  const now = deps.now ?? (() => new Date());
  const config = deps.config ?? loadConfig();
  const auth = createAuthService(store, now, config);
  const guards = makeGuards(auth);

  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  app.register(healthRoutes);
  app.register(authRoutes(auth, config, guards));
  app.register(accountRoutes(store, guards));
  app.register(adminRoutes(guards));
  return app;
}
