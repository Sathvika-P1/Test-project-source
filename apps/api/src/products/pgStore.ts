import type { Pool } from 'pg';
import {
  UnknownSubCategoryError,
  type Product,
  type ProductInput,
  type ProductStore,
  type Size,
} from './types.js';

interface Row {
  id: string;
  name: string;
  brand: string;
  description: string;
  sub_category_id: string;
  price_minor: number;
  sizes: string[];
  images: string[];
  top_level: string;
  sub_name: string;
}

const SELECT = `SELECT p.id, p.name, p.brand, p.description, p.sub_category_id, p.price_minor,
  p.sizes, p.images, s.top_level, s.name AS sub_name
  FROM products p JOIN sub_categories s ON s.id = p.sub_category_id`;

const toProduct = (r: Row): Product => ({
  id: r.id,
  name: r.name,
  brand: r.brand,
  description: r.description,
  subCategoryId: r.sub_category_id,
  price: r.price_minor / 100,
  sizes: r.sizes as Size[],
  images: r.images,
  subCategory: { id: r.sub_category_id, topLevel: r.top_level, name: r.sub_name },
});

const toMinor = (price: number) => Math.round(price * 100);
const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const FK_VIOLATION = '23503';
const INVALID_TEXT = '22P02';

const isUnknownSub = (err: unknown) =>
  typeof err === 'object' &&
  err !== null &&
  'code' in err &&
  (err.code === FK_VIOLATION || err.code === INVALID_TEXT);

export function pgProductStore(pool: Pool): ProductStore {
  const store: ProductStore = {
    async listSubCategories() {
      const { rows } = await pool.query(
        'SELECT id, top_level AS "topLevel", name FROM sub_categories ORDER BY top_level, name',
      );
      return rows;
    },
    async list(filter) {
      const { rows } = filter?.subCategoryId
        ? await pool.query<Row>(`${SELECT} WHERE p.sub_category_id = $1 ORDER BY p.created_at, p.id`, [
            filter.subCategoryId,
          ])
        : await pool.query<Row>(`${SELECT} ORDER BY p.created_at, p.id`);
      return rows.map(toProduct);
    },
    async get(id) {
      if (!isUuid(id)) return null;
      const { rows } = await pool.query<Row>(`${SELECT} WHERE p.id = $1`, [id]);
      return rows[0] ? toProduct(rows[0]) : null;
    },
    async create(input: ProductInput) {
      try {
        const { rows } = await pool.query<{ id: string }>(
          `INSERT INTO products (name, brand, description, sub_category_id, price_minor, sizes, images)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [input.name, input.brand, input.description, input.subCategoryId, toMinor(input.price), input.sizes, input.images],
        );
        return (await store.get(rows[0].id))!;
      } catch (err) {
        if (isUnknownSub(err)) throw new UnknownSubCategoryError();
        throw err;
      }
    },
    async update(id, patch) {
      if (!isUuid(id)) return null;
      const cols: Record<string, unknown> = {
        name: patch.name,
        brand: patch.brand,
        description: patch.description,
        sub_category_id: patch.subCategoryId,
        price_minor: patch.price === undefined ? undefined : toMinor(patch.price),
        sizes: patch.sizes,
        images: patch.images,
      };
      const entries = Object.entries(cols).filter(([, v]) => v !== undefined);
      if (entries.length === 0) return store.get(id);
      const sets = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
      try {
        const res = await pool.query(`UPDATE products SET ${sets}, updated_at = now() WHERE id = $1`, [
          id,
          ...entries.map(([, v]) => v),
        ]);
        return res.rowCount ? store.get(id) : null;
      } catch (err) {
        if (isUnknownSub(err)) throw new UnknownSubCategoryError();
        throw err;
      }
    },
    async remove(id) {
      if (!isUuid(id)) return false;
      const res = await pool.query('DELETE FROM products WHERE id = $1', [id]);
      return (res.rowCount ?? 0) > 0;
    },
  };
  return store;
}
