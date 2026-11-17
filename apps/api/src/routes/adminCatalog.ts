import type { FastifyInstance, FastifyReply } from 'fastify';
import type { CatalogStore } from '../catalog/store.js';
import type { CatalogErrorCode } from '../catalog/types.js';

const STATUS: Record<CatalogErrorCode, number> = {
  empty: 400,
  too_long: 400,
  wrong_top_category: 400,
  duplicate: 409,
  has_products: 409,
  not_found: 404,
};

function fail(reply: FastifyReply, error: CatalogErrorCode) {
  return reply.code(STATUS[error]).send({ error });
}

const toId = (raw: unknown) => {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Staff catalogue routes. Registered inside the gated scope of adminRoutes, so the one
 * requireAdmin hook covers them. There is no route for top-level categories: they are fixed.
 */
export function adminCatalogRoutes(store: CatalogStore) {
  return async (app: FastifyInstance): Promise<void> => {
    app.get('/admin/categories', async () => {
      const tops = await store.listTopCategories();
      return Promise.all(
        tops.map(async (t) => ({ ...t, subcategories: (await store.listSubcategories(t.slug)) ?? [] })),
      );
    });

    app.post<{ Params: { top: string }; Body: { name?: unknown } }>(
      '/admin/categories/:top/subcategories',
      async (req, reply) => {
        const res = await store.addSubcategory(req.params.top, req.body?.name as string);
        return res.ok ? reply.code(201).send(res.value) : fail(reply, res.error);
      },
    );

    app.patch<{ Params: { id: string }; Body: { name?: unknown } }>(
      '/admin/subcategories/:id',
      async (req, reply) => {
        const id = toId(req.params.id);
        if (id === null) return fail(reply, 'not_found');
        const res = await store.renameSubcategory(id, req.body?.name as string);
        return res.ok ? res.value : fail(reply, res.error);
      },
    );

    app.delete<{ Params: { id: string } }>('/admin/subcategories/:id', async (req, reply) => {
      const id = toId(req.params.id);
      if (id === null) return fail(reply, 'not_found');
      const res = await store.removeSubcategory(id);
      return res.ok ? reply.code(204).send() : fail(reply, res.error);
    });

    app.get('/admin/products', async () => store.listProducts());

    app.patch<{ Params: { id: string }; Body: { subcategoryId?: unknown } }>(
      '/admin/products/:id',
      async (req, reply) => {
        const productId = toId(req.params.id);
        if (productId === null) return fail(reply, 'not_found');
        const raw = req.body?.subcategoryId;
        const subcategoryId = raw === null || raw === undefined || raw === '' ? null : toId(raw);
        // A product always keeps a sub-category: a missing or cleared value writes nothing.
        if (subcategoryId === null) return reply.code(400).send({ error: 'subcategory_required' });
        const res = await store.moveProduct(productId, subcategoryId);
        return res.ok ? res.value : fail(reply, res.error);
      },
    );
  };
}
