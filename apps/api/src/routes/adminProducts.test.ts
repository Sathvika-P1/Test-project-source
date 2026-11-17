import { beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import type { Session } from '../auth/session.js';
import { memoryProductStore } from '../products/memoryStore.js';
import type { ProductStore } from '../products/types.js';

const admin: Session = { userId: 'u1', email: 'meera@x.test', role: 'admin' };
const shopper: Session = { userId: 'u2', email: 'arjun@x.test', role: 'shopper' };

let store: ProductStore;
let subs: { id: string; name: string }[];
let validProduct: Record<string, unknown>;

const staffApp = () => buildApp({ resolveSession: async () => admin, productStore: store });
const publicList = async (app: ReturnType<typeof staffApp>, sub: string) =>
  (await app.inject({ method: 'GET', url: `/products?subCategoryId=${sub}` })).json();

beforeEach(async () => {
  store = memoryProductStore();
  subs = await store.listSubCategories();
  validProduct = {
    name: 'Linen shirt',
    brand: 'Fabindia',
    description: 'Breathable linen.',
    subCategoryId: subs[0].id,
    price: 1599,
    sizes: ['M', 'L'],
    images: ['/img/a.jpg'],
  };
});

describe('staff create', () => {
  it('AC1: a saved product is listed in its sub-category on the storefront', async () => {
    const app = staffApp();
    const created = await app.inject({ method: 'POST', url: '/admin/products', payload: validProduct });
    expect(created.statusCode).toBe(201);
    const listed = await publicList(app, validProduct.subCategoryId as string);
    expect(listed.map((p: { name: string }) => p.name)).toContain('Linen shirt');
  });

  it('AC2: missing, empty or unknown sub-category is refused and nothing is stored', async () => {
    const app = staffApp();
    const { subCategoryId: _omit, ...noSub } = validProduct;
    for (const payload of [
      noSub,
      { ...validProduct, subCategoryId: '' },
      { ...validProduct, subCategoryId: null },
      { ...validProduct, subCategoryId: 'does-not-exist' },
    ]) {
      const res = await app.inject({ method: 'POST', url: '/admin/products', payload });
      expect(res.statusCode).toBe(400);
    }
    expect((await store.list()).length).toBe(0);
  });

  it('rejects out-of-scope fields, bad price and bad sizes', async () => {
    const app = staffApp();
    for (const extra of [{ stock: 4 }, { price: 0 }, { price: 10.999 }, { sizes: [] }, { sizes: ['XXL'] }, { images: [] }, { name: '  ' }]) {
      const res = await app.inject({ method: 'POST', url: '/admin/products', payload: { ...validProduct, ...extra } });
      expect(res.statusCode).toBe(400);
    }
    expect((await store.list()).length).toBe(0);
  });
});

describe('staff edit and remove', () => {
  let id: string;
  beforeEach(async () => {
    id = (await store.create(validProduct as never)).id;
  });

  it('AC3: a price-only PATCH changes the price and nothing else', async () => {
    const app = staffApp();
    const res = await app.inject({ method: 'PATCH', url: `/admin/products/${id}`, payload: { price: 1799 } });
    expect(res.statusCode).toBe(200);
    const [p] = await publicList(app, validProduct.subCategoryId as string);
    expect(p.price).toBe(1799);
    expect(p.name).toBe('Linen shirt');
  });

  it.each([
    ['name', 'Cotton shirt'],
    ['brand', 'Other'],
    ['description', 'New text'],
    ['images', ['/img/b.jpg', '/img/c.jpg']],
    ['sizes', ['S']],
    ['subCategoryId', 'second'],
  ])('AC4: changing %s is shown on the storefront', async (field, raw) => {
    const app = staffApp();
    const value = field === 'subCategoryId' ? subs[1].id : raw;
    const res = await app.inject({ method: 'PATCH', url: `/admin/products/${id}`, payload: { [field]: value } });
    expect(res.statusCode).toBe(200);
    const target = field === 'subCategoryId' ? (value as string) : (validProduct.subCategoryId as string);
    const p = (await publicList(app, target)).find((x: { id: string }) => x.id === id);
    expect(p[field]).toEqual(value);
    if (field === 'subCategoryId') {
      expect(await publicList(app, validProduct.subCategoryId as string)).toEqual([]);
    }
  });

  it('refuses to clear the sub-category on edit; unknown id is 404', async () => {
    const app = staffApp();
    const bad = await app.inject({ method: 'PATCH', url: `/admin/products/${id}`, payload: { subCategoryId: null } });
    expect(bad.statusCode).toBe(400);
    const missing = await app.inject({ method: 'PATCH', url: '/admin/products/nope', payload: { price: 5 } });
    expect(missing.statusCode).toBe(404);
  });

  it('AC5: removed product is gone from the storefront; second delete is 404', async () => {
    const app = staffApp();
    expect((await app.inject({ method: 'DELETE', url: `/admin/products/${id}` })).statusCode).toBe(204);
    const ids = (await publicList(app, validProduct.subCategoryId as string)).map((p: { id: string }) => p.id);
    expect(ids).not.toContain(id);
    expect((await app.inject({ method: 'DELETE', url: `/admin/products/${id}` })).statusCode).toBe(404);
  });

  it.each([
    ['POST', 'create'],
    ['PATCH', 'edit'],
    ['PATCH', 'price'],
    ['DELETE', 'remove'],
  ])('AC6: shopper cannot %s (%s); signed-out gets 401', async (method, kind) => {
    const before = await store.get(id);
    const payload =
      kind === 'create' ? validProduct : kind === 'edit' ? { name: 'Hacked' } : kind === 'price' ? { price: 1 } : undefined;
    const url = kind === 'create' ? '/admin/products' : `/admin/products/${id}`;
    const shopperApp = buildApp({ resolveSession: async () => shopper, productStore: store });
    const res = await shopperApp.inject({ method: method as 'POST', url, payload });
    expect(res.statusCode).toBe(403);
    const out = buildApp({ resolveSession: async () => null, productStore: store });
    expect((await out.inject({ method: method as 'POST', url, payload })).statusCode).toBe(401);
    expect(await store.get(id)).toEqual(before);
    expect((await store.list()).length).toBe(1);
  });
});
