import { randomUUID } from 'node:crypto';
import {
  SEED_SUB_CATEGORIES,
  UnknownSubCategoryError,
  type Product,
  type ProductInput,
  type ProductStore,
  type SubCategory,
} from './types.js';

export function memoryProductStore(): ProductStore {
  const subs: SubCategory[] = SEED_SUB_CATEGORIES.map(([topLevel, name]) => ({
    id: randomUUID(),
    topLevel,
    name,
  }));
  const rows = new Map<string, ProductInput & { id: string }>();

  const sub = (id: string) => subs.find((s) => s.id === id);
  const hydrate = (row: ProductInput & { id: string }): Product => ({
    ...row,
    sizes: [...row.sizes],
    images: [...row.images],
    subCategory: sub(row.subCategoryId)!,
  });

  return {
    async listSubCategories() {
      return subs.map((s) => ({ ...s }));
    },
    async list(filter) {
      return [...rows.values()]
        .filter((r) => !filter?.subCategoryId || r.subCategoryId === filter.subCategoryId)
        .map(hydrate);
    },
    async get(id) {
      const row = rows.get(id);
      return row ? hydrate(row) : null;
    },
    async create(input) {
      if (!sub(input.subCategoryId)) throw new UnknownSubCategoryError();
      const row = { ...input, id: randomUUID() };
      rows.set(row.id, row);
      return hydrate(row);
    },
    async update(id, patch) {
      const row = rows.get(id);
      if (!row) return null;
      if (patch.subCategoryId !== undefined && !sub(patch.subCategoryId)) {
        throw new UnknownSubCategoryError();
      }
      const next = { ...row, ...patch };
      rows.set(id, next);
      return hydrate(next);
    },
    async remove(id) {
      return rows.delete(id);
    },
  };
}
