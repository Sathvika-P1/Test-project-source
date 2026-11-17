import type { FastifyInstance } from 'fastify';
import type { CatalogueRepository } from '../catalogue/repository.js';

const CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

function toInt(value: unknown, fallback: number, max: number): number {
  const n = Number(value);
  if (value === undefined || !Number.isInteger(n) || n < 0) return fallback;
  return Math.min(n, max);
}

export function catalogueRoutes(repo: CatalogueRepository) {
  return async function register(app: FastifyInstance): Promise<void> {
    app.addHook('onSend', async (_req, reply) => {
      if (reply.statusCode < 400) reply.header('Cache-Control', CACHE_CONTROL);
    });

    app.get('/categories', async () => repo.listCategories());

    app.get<{ Params: { slug: string } }>(
      '/categories/:slug',
      async (req, reply) => {
        const category = await repo.getCategory(req.params.slug);
        if (!category) return reply.code(404).send({ error: 'Not found' });
        return category;
      },
    );

    app.get<{
      Querystring: {
        category?: string;
        featured?: string;
        limit?: string;
        offset?: string;
      };
    }>('/products', async (req, reply) => {
      const { category, featured, limit, offset } = req.query;
      if (featured !== undefined && featured !== 'true' && featured !== 'false') {
        return reply.code(400).send({ error: "featured must be 'true' or 'false'" });
      }
      return repo.listProducts({
        categorySlug: category || undefined,
        featured: featured === undefined ? undefined : featured === 'true',
        limit: toInt(limit, 24, 100),
        offset: toInt(offset, 0, 100000),
      });
    });

    app.get<{ Params: { slug: string } }>(
      '/products/:slug',
      async (req, reply) => {
        const product = await repo.getProduct(req.params.slug);
        if (!product) return reply.code(404).send({ error: 'Not found' });
        return product;
      },
    );

    app.get<{ Querystring: { q?: string } }>('/search', async (req) => {
      const q = (req.query.q ?? '').trim();
      if (!q) return { products: [], categories: [] };
      return repo.search(q, 24);
    });
  };
}
