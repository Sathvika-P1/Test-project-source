import type pg from 'pg';
import type { CatalogStore } from './store.js';
import {
  cleanName,
  type ProductRow,
  type Result,
  type Subcategory,
  type SubcategoryWithCount,
} from './types.js';

const PRODUCT_SQL = `
  SELECT p.id, p.name, p.brand, t.slug AS "topSlug", t.name AS "topName",
         s.id AS "subcategoryId", s.name AS "subcategoryName"
  FROM products p
  JOIN subcategories s ON s.id = p.subcategory_id
  JOIN top_categories t ON t.id = s.top_category_id`;

const UNIQUE_VIOLATION = '23505';
const FK_VIOLATION = '23503';

const code = (err: unknown) => (err as { code?: string }).code;

export function createPgCatalogStore(pool: pg.Pool): CatalogStore {
  const product = async (id: number): Promise<ProductRow | undefined> =>
    (await pool.query<ProductRow>(`${PRODUCT_SQL} WHERE p.id = $1`, [id])).rows[0];

  return {
    async listTopCategories() {
      const { rows } = await pool.query('SELECT id, name, slug FROM top_categories ORDER BY position');
      return rows;
    },
    async listSubcategories(topSlug): Promise<SubcategoryWithCount[] | null> {
      const top = await pool.query('SELECT 1 FROM top_categories WHERE slug = $1', [topSlug]);
      if (top.rowCount === 0) return null;
      const { rows } = await pool.query(
        `SELECT s.id, s.name, t.slug AS "topSlug", count(p.id)::int AS "productCount"
         FROM subcategories s
         JOIN top_categories t ON t.id = s.top_category_id
         LEFT JOIN products p ON p.subcategory_id = s.id
         WHERE t.slug = $1
         GROUP BY s.id, t.slug
         ORDER BY s.id`,
        [topSlug],
      );
      return rows;
    },
    async addSubcategory(topSlug, rawName): Promise<Result<Subcategory>> {
      const name = cleanName(rawName);
      if (!name.ok) return name;
      try {
        const { rows } = await pool.query(
          `INSERT INTO subcategories (top_category_id, name)
           SELECT id, $2 FROM top_categories WHERE slug = $1
           RETURNING id, name, $1::text AS "topSlug"`,
          [topSlug, name.value],
        );
        return rows[0] ? { ok: true, value: rows[0] } : { ok: false, error: 'not_found' };
      } catch (err) {
        if (code(err) === UNIQUE_VIOLATION) return { ok: false, error: 'duplicate' };
        throw err;
      }
    },
    async renameSubcategory(id, rawName): Promise<Result<Subcategory>> {
      const name = cleanName(rawName);
      if (!name.ok) return name;
      try {
        const { rows } = await pool.query(
          `UPDATE subcategories s SET name = $2
           FROM top_categories t
           WHERE s.id = $1 AND t.id = s.top_category_id
           RETURNING s.id, s.name, t.slug AS "topSlug"`,
          [id, name.value],
        );
        return rows[0] ? { ok: true, value: rows[0] } : { ok: false, error: 'not_found' };
      } catch (err) {
        if (code(err) === UNIQUE_VIOLATION) return { ok: false, error: 'duplicate' };
        throw err;
      }
    },
    async removeSubcategory(id): Promise<Result<void>> {
      try {
        const res = await pool.query('DELETE FROM subcategories WHERE id = $1', [id]);
        return res.rowCount ? { ok: true, value: undefined } : { ok: false, error: 'not_found' };
      } catch (err) {
        if (code(err) === FK_VIOLATION) return { ok: false, error: 'has_products' };
        throw err;
      }
    },
    async listProducts(topSlug) {
      const { rows } = topSlug
        ? await pool.query<ProductRow>(`${PRODUCT_SQL} WHERE t.slug = $1 ORDER BY p.id`, [topSlug])
        : await pool.query<ProductRow>(`${PRODUCT_SQL} ORDER BY p.id`);
      return rows;
    },
    async moveProduct(productId, subcategoryId): Promise<Result<ProductRow>> {
      const current = await product(productId);
      const target = await pool.query('SELECT top_category_id FROM subcategories WHERE id = $1', [
        subcategoryId,
      ]);
      if (!current || !target.rows[0]) return { ok: false, error: 'not_found' };
      const same = await pool.query(
        `SELECT 1 FROM subcategories a JOIN subcategories b ON a.top_category_id = b.top_category_id
         WHERE a.id = $1 AND b.id = $2`,
        [current.subcategoryId, subcategoryId],
      );
      if (same.rowCount === 0) return { ok: false, error: 'wrong_top_category' };
      await pool.query('UPDATE products SET subcategory_id = $2 WHERE id = $1', [productId, subcategoryId]);
      return { ok: true, value: (await product(productId))! };
    },
  };
}
