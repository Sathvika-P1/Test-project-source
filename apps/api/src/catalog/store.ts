import type {
  ProductRow,
  Result,
  Subcategory,
  SubcategoryWithCount,
  TopCategory,
} from './types.js';

/**
 * Catalogue persistence. There is deliberately NO method that adds, renames or removes a
 * top-level category: those seven are fixed.
 */
export interface CatalogStore {
  listTopCategories(): Promise<TopCategory[]>;
  /** null = unknown top-level category. */
  listSubcategories(topSlug: string): Promise<SubcategoryWithCount[] | null>;
  addSubcategory(topSlug: string, name: string): Promise<Result<Subcategory>>;
  renameSubcategory(id: number, name: string): Promise<Result<Subcategory>>;
  /** Refuses when the sub-category still has products. */
  removeSubcategory(id: number): Promise<Result<void>>;
  listProducts(topSlug?: string): Promise<ProductRow[]>;
  /** The sub-category must belong to the product's top-level category. */
  moveProduct(productId: number, subcategoryId: number): Promise<Result<ProductRow>>;
}
