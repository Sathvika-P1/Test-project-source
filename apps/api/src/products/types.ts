export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'One size'] as const;
export type Size = (typeof SIZES)[number];

export interface SubCategory {
  id: string;
  topLevel: string;
  name: string;
}

export interface ProductInput {
  name: string;
  brand: string;
  description: string;
  subCategoryId: string;
  /** Whole rupees, at most 2 decimals. */
  price: number;
  sizes: Size[];
  images: string[];
}

export interface Product extends ProductInput {
  id: string;
  subCategory: SubCategory;
}

export interface ProductStore {
  listSubCategories(): Promise<SubCategory[]>;
  list(filter?: { subCategoryId?: string }): Promise<Product[]>;
  get(id: string): Promise<Product | null>;
  /** Throws UnknownSubCategoryError when the sub-category does not exist. */
  create(input: ProductInput): Promise<Product>;
  update(id: string, patch: Partial<ProductInput>): Promise<Product | null>;
  remove(id: string): Promise<boolean>;
}

export class UnknownSubCategoryError extends Error {
  constructor() {
    super('unknown sub-category');
  }
}

/** The prototype's sub-categories; seeded in the migration and the in-memory store. */
export const SEED_SUB_CATEGORIES: ReadonlyArray<readonly [string, string]> = [
  ['Men', 'Shirts'],
  ['Men', 'Kurtas'],
  ['Men', 'Sneakers'],
  ['Women', 'Kurtas'],
  ['Women', 'Sarees'],
  ['Women', 'Tops'],
  ['Home', 'Tableware'],
  ['Home', 'Cushions'],
];
