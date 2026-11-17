import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import type { CatalogueRepository } from '../catalogue/repository.js';
import type { Category, Product } from '../catalogue/types.js';

const categories: Category[] = [
  { id: 1, slug: 'men', name: 'Men', parentId: null, sortOrder: 1 },
];
const products: Product[] = [
  {
    id: 1,
    slug: 'cotton-shirt',
    name: 'Cotton Shirt',
    brand: 'Roadster',
    description: 'A shirt',
    priceCents: 1000,
    currency: 'INR',
    imageUrl: null,
    categoryId: 1,
    featured: true,
  },
  {
    id: 2,
    slug: 'jeans',
    name: 'Jeans',
    brand: 'Levis',
    description: 'Denim',
    priceCents: 2000,
    currency: 'INR',
    imageUrl: null,
    categoryId: 1,
    featured: false,
  },
];

const fakeRepo: CatalogueRepository = {
  listCategories: async () => categories,
  getCategory: async (slug) => categories.find((c) => c.slug === slug) ?? null,
  listProducts: async ({ featured, categorySlug }) =>
    products.filter(
      (p) =>
        (featured === undefined || p.featured === featured) &&
        (categorySlug === undefined || categorySlug === 'men'),
    ),
  getProduct: async (slug) => products.find((p) => p.slug === slug) ?? null,
  search: async (q) => ({
    products: products.filter((p) =>
      p.name.toLowerCase().includes(q.toLowerCase()),
    ),
    categories: categories.filter((c) =>
      c.name.toLowerCase().includes(q.toLowerCase()),
    ),
  }),
};

describe('catalogue routes', () => {
  const app = buildApp({ catalogue: fakeRepo });

  it('lists featured products with cache headers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/products?featured=true&limit=8&offset=0',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(res.headers['cache-control']).toContain('max-age=60');
  });

  it('lists categories and a single category', async () => {
    expect(
      (await app.inject({ method: 'GET', url: '/categories' })).json(),
    ).toHaveLength(1);
    expect(
      (await app.inject({ method: 'GET', url: '/categories/men' })).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ method: 'GET', url: '/categories/nope' })).statusCode,
    ).toBe(404);
  });

  it('returns a product by slug and 404 when absent', async () => {
    expect(
      (await app.inject({ method: 'GET', url: '/products/jeans' })).json().name,
    ).toBe('Jeans');
    expect(
      (await app.inject({ method: 'GET', url: '/products/nope' })).statusCode,
    ).toBe(404);
  });

  it('searches products and categories', async () => {
    const res = await app.inject({ method: 'GET', url: '/search?q=shirt' });
    expect(res.json().products[0].name).toMatch(/shirt/i);
    expect(
      (await app.inject({ method: 'GET', url: '/search?q=' })).json(),
    ).toEqual({ products: [], categories: [] });
  });

  it('does not register catalogue routes without a repository', async () => {
    const bare = buildApp();
    expect(
      (await bare.inject({ method: 'GET', url: '/products' })).statusCode,
    ).toBe(404);
  });
});
