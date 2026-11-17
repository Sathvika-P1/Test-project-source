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

export interface SearchResults {
  products: Product[];
  categories: Category[];
}

const baseUrl = () => process.env.SHOP_API_URL ?? "http://localhost:3001";

async function request<T>(
  path: string,
  init: RequestInit & { next?: { revalidate: number } },
): Promise<T | null> {
  const res = await fetch(`${baseUrl()}${path}`, init);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Shop API ${path} failed with ${res.status}`);
  return (await res.json()) as T;
}

const cached = { next: { revalidate: 60 } } as const;

export async function getCategories(): Promise<Category[]> {
  return (await request<Category[]>("/categories", cached)) ?? [];
}

export function getCategory(slug: string): Promise<Category | null> {
  return request<Category>(`/categories/${encodeURIComponent(slug)}`, cached);
}

export async function getProducts(
  opts: { categorySlug?: string; featured?: boolean; limit?: number; offset?: number } = {},
): Promise<Product[]> {
  const params = new URLSearchParams();
  if (opts.categorySlug) params.set("category", opts.categorySlug);
  if (opts.featured !== undefined) params.set("featured", String(opts.featured));
  if (opts.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts.offset !== undefined) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return (await request<Product[]>(`/products${qs ? `?${qs}` : ""}`, cached)) ?? [];
}

export function getProduct(slug: string): Promise<Product | null> {
  return request<Product>(`/products/${encodeURIComponent(slug)}`, cached);
}

export async function searchCatalogue(q: string): Promise<SearchResults> {
  const res = await request<SearchResults>(`/search?q=${encodeURIComponent(q)}`, {
    cache: "no-store",
  });
  return res ?? { products: [], categories: [] };
}
