import type { CatalogStore } from './store.js';
import {
  cleanName,
  TOP_CATEGORY_NAMES,
  topSlug as slugOf,
  type ProductRow,
  type Result,
  type Subcategory,
  type TopCategory,
} from './types.js';

export interface MemorySeed {
  /** Sub-categories by top-level name. */
  subcategories?: Record<string, string[]>;
  /** Products by name, placed in a sub-category of a top-level category. */
  products?: { name: string; brand?: string; top: string; sub: string }[];
}

interface ProductRecord {
  id: number;
  name: string;
  brand: string;
  subcategoryId: number;
}

export function createMemoryCatalogStore(seed: MemorySeed = {}): CatalogStore {
  const tops: TopCategory[] = TOP_CATEGORY_NAMES.map((name, i) => ({
    id: i + 1,
    name,
    slug: slugOf(name),
  }));
  const subs: Subcategory[] = [];
  const products: ProductRecord[] = [];
  let nextSubId = 1;
  let nextProductId = 1;

  const topBySlug = (slug: string) => tops.find((t) => t.slug === slug);
  const taken = (slug: string, name: string, exceptId?: number) =>
    subs.some(
      (s) => s.topSlug === slug && s.id !== exceptId && s.name.toLowerCase() === name.toLowerCase(),
    );

  for (const [topName, names] of Object.entries(seed.subcategories ?? {})) {
    for (const name of names) subs.push({ id: nextSubId++, name, topSlug: slugOf(topName) });
  }
  for (const p of seed.products ?? []) {
    const sub = subs.find((s) => s.topSlug === slugOf(p.top) && s.name === p.sub);
    if (!sub) throw new Error(`seed product ${p.name}: unknown sub-category ${p.sub}`);
    products.push({ id: nextProductId++, name: p.name, brand: p.brand ?? '', subcategoryId: sub.id });
  }

  const toRow = (p: ProductRecord): ProductRow => {
    const sub = subs.find((s) => s.id === p.subcategoryId)!;
    const top = topBySlug(sub.topSlug)!;
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      topSlug: top.slug,
      topName: top.name,
      subcategoryId: sub.id,
      subcategoryName: sub.name,
    };
  };

  return {
    async listTopCategories() {
      return tops.map((t) => ({ ...t }));
    },
    async listSubcategories(slug) {
      if (!topBySlug(slug)) return null;
      return subs
        .filter((s) => s.topSlug === slug)
        .map((s) => ({
          ...s,
          productCount: products.filter((p) => p.subcategoryId === s.id).length,
        }));
    },
    async addSubcategory(slug, rawName): Promise<Result<Subcategory>> {
      if (!topBySlug(slug)) return { ok: false, error: 'not_found' };
      const name = cleanName(rawName);
      if (!name.ok) return name;
      if (taken(slug, name.value)) return { ok: false, error: 'duplicate' };
      const sub = { id: nextSubId++, name: name.value, topSlug: slug };
      subs.push(sub);
      return { ok: true, value: { ...sub } };
    },
    async renameSubcategory(id, rawName): Promise<Result<Subcategory>> {
      const sub = subs.find((s) => s.id === id);
      if (!sub) return { ok: false, error: 'not_found' };
      const name = cleanName(rawName);
      if (!name.ok) return name;
      if (taken(sub.topSlug, name.value, id)) return { ok: false, error: 'duplicate' };
      sub.name = name.value;
      return { ok: true, value: { ...sub } };
    },
    async removeSubcategory(id): Promise<Result<void>> {
      const i = subs.findIndex((s) => s.id === id);
      if (i < 0) return { ok: false, error: 'not_found' };
      if (products.some((p) => p.subcategoryId === id)) return { ok: false, error: 'has_products' };
      subs.splice(i, 1);
      return { ok: true, value: undefined };
    },
    async listProducts(slug) {
      return products.map(toRow).filter((p) => !slug || p.topSlug === slug);
    },
    async moveProduct(productId, subcategoryId): Promise<Result<ProductRow>> {
      const product = products.find((p) => p.id === productId);
      const target = subs.find((s) => s.id === subcategoryId);
      if (!product || !target) return { ok: false, error: 'not_found' };
      if (toRow(product).topSlug !== target.topSlug) return { ok: false, error: 'wrong_top_category' };
      product.subcategoryId = target.id;
      return { ok: true, value: toRow(product) };
    },
  };
}
