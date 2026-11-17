import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import type { Session } from '../auth/session.js';
import { createMemoryCatalogStore } from '../catalog/memoryStore.js';

const admin: Session = { userId: 'u1', email: 'meera@x.test', role: 'admin' };
const shopper: Session = { userId: 'u2', email: 'arjun@x.test', role: 'shopper' };

function setup(session: Session | null = admin) {
  const store = createMemoryCatalogStore({
    subcategories: { Men: ['Shirts', 'Jeans'], Women: ['Kurtas'] },
    products: [
      { name: 'Oxford shirt', top: 'Men', sub: 'Shirts' },
      { name: 'Block-print kurta', top: 'Women', sub: 'Kurtas' },
    ],
  });
  const app = buildApp({ resolveSession: async () => session, catalog: store });
  return { app, store };
}

async function tops(app: ReturnType<typeof setup>['app']) {
  return (await app.inject({ method: 'GET', url: '/admin/categories' })).json() as {
    name: string;
    subcategories: { id: number; name: string }[];
  }[];
}
const men = async (app: ReturnType<typeof setup>['app']) =>
  (await tops(app)).find((t) => t.name === 'Men')!;

describe('add sub-category', () => {
  it('AC1: lists a new sub-category under Men', async () => {
    const { app } = setup();
    const res = await app.inject({
      method: 'POST',
      url: '/admin/categories/men/subcategories',
      payload: { name: 'Sneakers' },
    });
    expect(res.statusCode).toBe(201);
    expect((await men(app)).subcategories.map((s) => s.name)).toContain('Sneakers');
  });

  it('refuses empty names, case-insensitive duplicates; allows same name under another top', async () => {
    const { app } = setup();
    const post = (top: string, name: unknown) =>
      app.inject({ method: 'POST', url: `/admin/categories/${top}/subcategories`, payload: { name } });
    expect((await post('men', '   ')).statusCode).toBe(400);
    expect((await post('men', 'x'.repeat(61))).statusCode).toBe(400);
    expect((await post('men', 'sHIRTS')).statusCode).toBe(409);
    expect((await post('women', 'Shirts')).statusCode).toBe(201);
    expect((await post('nope', 'Shirts')).statusCode).toBe(404);
  });

  it('denies a shopper (403) and a signed-out visitor (401) with nothing written', async () => {
    for (const [session, code] of [[shopper, 403], [null, 401]] as const) {
      const { app, store } = setup(session);
      const res = await app.inject({
        method: 'POST',
        url: '/admin/categories/men/subcategories',
        payload: { name: 'Sneakers' },
      });
      expect(res.statusCode).toBe(code);
      expect((await store.listSubcategories('men'))!.map((s) => s.name)).not.toContain('Sneakers');
    }
  });
});

describe('rename sub-category', () => {
  it('AC2: renames and keeps the id and its products', async () => {
    const { app, store } = setup();
    const shirts = (await men(app)).subcategories.find((s) => s.name === 'Shirts')!;
    const res = await app.inject({
      method: 'PATCH',
      url: `/admin/subcategories/${shirts.id}`,
      payload: { name: 'Formal Shirts' },
    });
    expect(res.statusCode).toBe(200);
    const names = (await men(app)).subcategories.map((s) => s.name);
    expect(names).toContain('Formal Shirts');
    expect(names).not.toContain('Shirts');
    expect((await store.listProducts())[0]!.subcategoryId).toBe(shirts.id);
  });

  it('refuses duplicate (409) and empty (400) names', async () => {
    const { app } = setup();
    const shirts = (await men(app)).subcategories.find((s) => s.name === 'Shirts')!;
    const patch = (name: string) =>
      app.inject({ method: 'PATCH', url: `/admin/subcategories/${shirts.id}`, payload: { name } });
    expect((await patch('jeans')).statusCode).toBe(409);
    expect((await patch('')).statusCode).toBe(400);
  });
});

describe('remove sub-category', () => {
  it('refuses with 409 has_products, removes an empty one', async () => {
    const { app } = setup();
    const subs = (await men(app)).subcategories;
    const shirts = subs.find((s) => s.name === 'Shirts')!;
    const jeans = subs.find((s) => s.name === 'Jeans')!;
    const full = await app.inject({ method: 'DELETE', url: `/admin/subcategories/${shirts.id}` });
    expect(full.statusCode).toBe(409);
    expect(full.json()).toEqual({ error: 'has_products' });
    expect((await app.inject({ method: 'DELETE', url: `/admin/subcategories/${jeans.id}` })).statusCode).toBe(204);
    expect((await men(app)).subcategories.map((s) => s.name)).toEqual(['Shirts']);
  });
});

describe('move product', () => {
  async function withFormal() {
    const ctx = setup();
    const add = await ctx.app.inject({
      method: 'POST',
      url: '/admin/categories/men/subcategories',
      payload: { name: 'Formal Shirts' },
    });
    return { ...ctx, formalId: add.json().id as number };
  }

  it('AC3: lists the product under the new sub-category only', async () => {
    const { app, store, formalId } = await withFormal();
    const productId = (await store.listProducts())[0]!.id;
    const res = await app.inject({
      method: 'PATCH',
      url: `/admin/products/${productId}`,
      payload: { subcategoryId: formalId },
    });
    expect(res.statusCode).toBe(200);
    const subs = (await men(app)).subcategories;
    const inShirts = (await store.listProducts('men')).filter(
      (p) => p.subcategoryId === subs.find((s) => s.name === 'Shirts')!.id,
    );
    const inFormal = (await store.listProducts('men')).filter((p) => p.subcategoryId === formalId);
    expect(inShirts.map((p) => p.id)).not.toContain(productId);
    expect(inFormal.map((p) => p.id)).toEqual([productId]);
  });

  it('refuses a sub-category under a different top-level category', async () => {
    const { app, store } = await withFormal();
    const productId = (await store.listProducts('men'))[0]!.id;
    const kurtas = (await store.listSubcategories('women'))![0]!;
    const res = await app.inject({
      method: 'PATCH',
      url: `/admin/products/${productId}`,
      payload: { subcategoryId: kurtas.id },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'wrong_top_category' });
    expect((await store.listProducts('men'))[0]!.subcategoryName).toBe('Shirts');
  });

  it.each([{}, { subcategoryId: null }, { subcategoryId: '' }])(
    'AC4: refuses a cleared sub-category %j and keeps the previous one',
    async (payload) => {
      const { app, store } = await withFormal();
      const productId = (await store.listProducts())[0]!.id;
      const res = await app.inject({ method: 'PATCH', url: `/admin/products/${productId}`, payload });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'subcategory_required' });
      expect((await store.listProducts()).find((p) => p.id === productId)!.subcategoryName).toBe('Shirts');
    },
  );

  it('lists products for staff only', async () => {
    const { app } = setup();
    expect((await app.inject({ method: 'GET', url: '/admin/products' })).json()).toHaveLength(2);
    const denied = setup(shopper);
    expect((await denied.app.inject({ method: 'GET', url: '/admin/products' })).statusCode).toBe(403);
  });
});

describe('top-level categories are fixed', () => {
  it('AC7: lists exactly the seven top-level categories', async () => {
    const { app } = setup();
    expect((await tops(app)).map((t) => t.name)).toEqual([
      'Men', 'Women', 'Kids', 'Home', 'Beauty', 'GenZ', 'Studio',
    ]);
  });

  it('AC8: offers no route to add, rename or remove one', async () => {
    const { app } = setup();
    for (const [method, url] of [
      ['POST', '/admin/categories'],
      ['PATCH', '/admin/categories/men'],
      ['DELETE', '/admin/categories/men'],
    ] as const) {
      const res = await app.inject({ method, url, payload: { name: 'X' } });
      expect(res.statusCode).toBe(404);
    }
  });
});
