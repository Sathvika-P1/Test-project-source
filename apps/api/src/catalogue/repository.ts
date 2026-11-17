import type { Pool } from 'pg';
import type { Category, Product } from './types.js';

export interface CatalogueRepository {
  listCategories(): Promise<Category[]>;
  getCategory(slug: string): Promise<Category | null>;
  listProducts(opts: {
    categorySlug?: string;
    featured?: boolean;
    limit: number;
    offset: number;
  }): Promise<Product[]>;
  getProduct(slug: string): Promise<Product | null>;
  search(
    q: string,
    limit: number,
  ): Promise<{ products: Product[]; categories: Category[] }>;
}

const CATEGORY_COLS =
  'id, slug, name, parent_id AS "parentId", sort_order AS "sortOrder"';
const PRODUCT_COLS =
  'p.id, p.slug, p.name, p.brand, p.description, p.price_cents AS "priceCents", p.currency, p.image_url AS "imageUrl", p.category_id AS "categoryId", p.featured';

export function createPgRepository(pool: Pool): CatalogueRepository {
  return {
    async listCategories() {
      const r = await pool.query(
        `SELECT ${CATEGORY_COLS} FROM categories ORDER BY sort_order, name`,
      );
      return r.rows;
    },
    async getCategory(slug) {
      const r = await pool.query(
        `SELECT ${CATEGORY_COLS} FROM categories WHERE slug = $1`,
        [slug],
      );
      return r.rows[0] ?? null;
    },
    async listProducts({ categorySlug, featured, limit, offset }) {
      const r = await pool.query(
        `SELECT ${PRODUCT_COLS} FROM products p
         JOIN categories c ON c.id = p.category_id
         WHERE ($1::text IS NULL OR c.slug = $1)
           AND ($2::boolean IS NULL OR p.featured = $2)
         ORDER BY p.id LIMIT $3 OFFSET $4`,
        [categorySlug ?? null, featured ?? null, limit, offset],
      );
      return r.rows;
    },
    async getProduct(slug) {
      const r = await pool.query(
        `SELECT ${PRODUCT_COLS} FROM products p WHERE p.slug = $1`,
        [slug],
      );
      return r.rows[0] ?? null;
    },
    async search(q, limit) {
      const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
      const products = await pool.query(
        `SELECT ${PRODUCT_COLS} FROM products p
         WHERE to_tsvector('simple', p.name || ' ' || p.brand || ' ' || p.description)
               @@ plainto_tsquery('simple', $1)
            OR p.name ILIKE $2 OR p.brand ILIKE $2
         ORDER BY p.id LIMIT $3`,
        [q, like, limit],
      );
      const categories = await pool.query(
        `SELECT ${CATEGORY_COLS} FROM categories WHERE name ILIKE $1 ORDER BY sort_order, name LIMIT $2`,
        [like, limit],
      );
      return { products: products.rows, categories: categories.rows };
    },
  };
}
