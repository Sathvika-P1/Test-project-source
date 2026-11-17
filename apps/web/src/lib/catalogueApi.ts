export const SIZES = ["XS", "S", "M", "L", "XL", "One size"] as const;
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
  price: number;
  sizes: Size[];
  images: string[];
}

export interface Product extends ProductInput {
  id: string;
  subCategory: SubCategory;
}

export type SaveResult =
  | { ok: true; product: Product }
  | { ok: false; reason: "not-staff" | "invalid" | "error"; fields?: Record<string, string> };

const DEFAULT_API_BASE_URL = "http://localhost:3000";

export function apiBase(): string {
  return process.env.API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

/** Server-side only: forwards the request cookie, never cached. Throws on any failure (fails closed). */
async function getJson<T>(path: string, cookieHeader: string | null): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Shop API ${path} answered ${res.status}`);
  return (await res.json()) as T;
}

export const listProducts = (cookie: string | null) => getJson<Product[]>("/admin/products", cookie);
export const getProduct = (id: string, cookie: string | null) =>
  getJson<Product>(`/admin/products/${encodeURIComponent(id)}`, cookie);
export const listSubCategories = (cookie: string | null) =>
  getJson<SubCategory[]>("/admin/sub-categories", cookie);

export const listPublicSubCategories = () => getJson<SubCategory[]>("/sub-categories", null);
export const listPublicProducts = (subCategoryId?: string) =>
  getJson<Product[]>(
    subCategoryId ? `/products?subCategoryId=${encodeURIComponent(subCategoryId)}` : "/products",
    null,
  );
