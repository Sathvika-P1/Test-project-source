import type { FastifyInstance } from 'fastify';
import type { CatalogStore } from '../catalog/store.js';

/** Public (shopper) reads: read-only, from the same tables staff edit. */
export function categoryRoutes(store: CatalogStore) {
  return async (app: FastifyInstance): Promise<void> => {
    app.get('/categories', async () => store.listTopCategories());

    app.get<{ Params: { top: string } }>('/categories/:top', async (req, reply) => {
      const tops = await store.listTopCategories();
      const top = tops.find((t) => t.slug === req.params.top);
      const subs = top ? await store.listSubcategories(top.slug) : null;
      if (!top || !subs) return reply.code(404).send({ error: 'not_found' });
      return { top, subcategories: subs.map((s) => ({ id: s.id, name: s.name })) };
    });
  };
}
