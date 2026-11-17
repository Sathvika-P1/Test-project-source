import type { FastifyInstance } from 'fastify';
import type { ProductStore } from '../products/types.js';

/** Public storefront reads: no session needed, no admin-only fields. */
export async function catalogueRoutes(
  app: FastifyInstance,
  opts: { productStore: ProductStore },
): Promise<void> {
  app.get('/sub-categories', async () => opts.productStore.listSubCategories());

  app.get<{ Querystring: { subCategoryId?: string } }>(
    '/products',
    { schema: { querystring: { type: 'object', properties: { subCategoryId: { type: 'string' } } } } },
    async (req) => opts.productStore.list({ subCategoryId: req.query.subCategoryId || undefined }),
  );
}
