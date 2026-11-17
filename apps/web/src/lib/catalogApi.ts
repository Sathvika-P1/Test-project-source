export interface TopCategory {
  id: number;
  name: string;
  slug: string;
}

export interface AdminSubcategory {
  id: number;
  name: string;
  productCount: number;
}

export interface AdminTop extends TopCategory {
  subcategories: AdminSubcategory[];
}

export interface AdminProduct {
  id: number;
  name: string;
  brand: string;
  topSlug: string;
  topName: string;
  subcategoryId: number;
  subcategoryName: string;
}

export interface ShopCategory {
  top: TopCategory;
  subcategories: { id: number; name: string }[];
}

export type WriteResult = { ok: true } | { ok: false; error: string };

const DEFAULT_API_BASE_URL = "http://localhost:3000";
const base = () => process.env.API_BASE_URL ?? DEFAULT_API_BASE_URL;
const headers = (cookie: string | null): Record<string, string> => (cookie ? { cookie } : {});

/** GET JSON from the Shop API. Returns null on any failure (fail closed: callers show the error state). */
async function getJson<T>(path: string, cookie: string | null, fetchImpl: typeof fetch): Promise<T | null> {
  try {
    const res = await fetchImpl(`${base()}${path}`, { headers: headers(cookie), cache: "no-store" });
    return res.ok ? ((await res.json()) as T) : null;
  } catch (err) {
    console.error(`catalogue request ${path} failed`, err);
    return null;
  }
}

async function send(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body: unknown,
  cookie: string | null,
  fetchImpl: typeof fetch,
): Promise<WriteResult> {
  try {
    const res = await fetchImpl(`${base()}${path}`, {
      method,
      headers: { ...headers(cookie), "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: data.error ?? "failed" };
  } catch (err) {
    console.error(`catalogue write ${path} failed`, err);
    return { ok: false, error: "unreachable" };
  }
}

export const getAdminCategories = (cookie: string | null, f: typeof fetch = fetch) =>
  getJson<AdminTop[]>("/admin/categories", cookie, f);

export const getAdminProducts = (cookie: string | null, f: typeof fetch = fetch) =>
  getJson<AdminProduct[]>("/admin/products", cookie, f);

export const getShopTops = (f: typeof fetch = fetch) => getJson<TopCategory[]>("/categories", null, f);

export const getShopCategory = (slug: string, f: typeof fetch = fetch) =>
  getJson<ShopCategory>(`/categories/${encodeURIComponent(slug)}`, null, f);

export const apiAddSubcategory = (cookie: string | null, topSlug: string, name: string, f: typeof fetch = fetch) =>
  send("POST", `/admin/categories/${encodeURIComponent(topSlug)}/subcategories`, { name }, cookie, f);

export const apiRenameSubcategory = (cookie: string | null, id: number, name: string, f: typeof fetch = fetch) =>
  send("PATCH", `/admin/subcategories/${id}`, { name }, cookie, f);

export const apiRemoveSubcategory = (cookie: string | null, id: number, f: typeof fetch = fetch) =>
  send("DELETE", `/admin/subcategories/${id}`, undefined, cookie, f);

export const apiMoveProduct = (
  cookie: string | null,
  productId: number,
  subcategoryId: number | null,
  f: typeof fetch = fetch,
) => send("PATCH", `/admin/products/${productId}`, { subcategoryId }, cookie, f);
