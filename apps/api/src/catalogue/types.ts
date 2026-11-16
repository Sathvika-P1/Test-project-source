export interface Category {
  id: number;
  slug: string;
  name: string;
  parentId: number | null;
  sortOrder: number;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  brand: string;
  description: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  categoryId: number;
  featured: boolean;
}
