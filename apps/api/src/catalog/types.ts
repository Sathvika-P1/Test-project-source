export const TOP_CATEGORY_NAMES = ['Men', 'Women', 'Kids', 'Home', 'Beauty', 'GenZ', 'Studio'] as const;

export const MAX_SUBCATEGORY_NAME = 60;

export interface TopCategory {
  id: number;
  name: string;
  slug: string;
}

export interface Subcategory {
  id: number;
  name: string;
  topSlug: string;
}

export interface SubcategoryWithCount extends Subcategory {
  productCount: number;
}

export interface ProductRow {
  id: number;
  name: string;
  brand: string;
  topSlug: string;
  topName: string;
  subcategoryId: number;
  subcategoryName: string;
}

export type CatalogErrorCode =
  | 'empty'
  | 'too_long'
  | 'duplicate'
  | 'has_products'
  | 'not_found'
  | 'wrong_top_category';

export type Result<T> = { ok: true; value: T } | { ok: false; error: CatalogErrorCode };

export function topSlug(name: string): string {
  return name.toLowerCase();
}

/** Trims and validates a sub-category name; returns the clean name or an error code. */
export function cleanName(raw: unknown): Result<string> {
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (!name) return { ok: false, error: 'empty' };
  if (name.length > MAX_SUBCATEGORY_NAME) return { ok: false, error: 'too_long' };
  return { ok: true, value: name };
}
