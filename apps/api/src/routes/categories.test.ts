import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { createMemoryCatalogStore } from '../catalog/memoryStore.js';

function setup() {
  const store = createMemoryCatalogStore({ subcategories: { Men: ['Shirts'] } });
  const app = buildApp({
    resolveSession: async () => ({ userId: 'u1', email: 'm@x.test', role: 'admin' }),
    catalog: store,
  });
  return { app, store };
}
const names = async (app: ReturnType<typeof setup>['app']) =>
  ((await app.inject({ method: 'GET', url: '/categories/men' })).json().subcategories as { name: string }[]).map(
    (s) => s.name,
  );

describe('public category routes', () => {
  it('lists the seven tops without a session', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: '/categories' });
    expect(res.statusCode).toBe(200);
    expect(res.json().map((t: { name: string }) => t.name)).toEqual([
      'Men', 'Women', 'Kids', 'Home', 'Beauty', 'GenZ', 'Studio',
    ]);
  });

  it('404s an unknown top-level category', async () => {
    const res = await buildApp().inject({ method: 'GET', url: '/categories/nope' });
    expect(res.statusCode).toBe(404);
  });

  it('AC5: shows a newly added sub-category', async () => {
    const { app } = setup();
    await app.inject({ method: 'POST', url: '/admin/categories/men/subcategories', payload: { name: 'Sneakers' } });
    expect(await names(app)).toContain('Sneakers');
  });

  it('AC6: shows the renamed sub-category and not the old name', async () => {
    const { app, store } = setup();
    const id = (await store.listSubcategories('men'))![0]!.id;
    await app.inject({ method: 'PATCH', url: `/admin/subcategories/${id}`, payload: { name: 'Formal Shirts' } });
    const list = await names(app);
    expect(list).toContain('Formal Shirts');
    expect(list).not.toContain('Shirts');
  });
});
