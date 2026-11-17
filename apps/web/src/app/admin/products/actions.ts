"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { apiBase, type Product, type ProductInput, type SaveResult } from "@/lib/catalogueApi";

export type DeleteResult = { ok: true } | { ok: false; reason: "not-staff" | "error" };

/** Calls the Shop API with the shopper's cookie; the API is the only place the staff role is enforced. */
async function call(method: string, path: string, body?: unknown): Promise<Response | null> {
  const cookie = (await cookies()).toString();
  try {
    return await fetch(`${apiBase()}${path}`, {
      method,
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (err) {
    console.error("Shop API request failed", err);
    return null;
  }
}

function refresh() {
  revalidatePath("/shop");
  revalidatePath("/admin/products");
}

async function save(method: string, path: string, body: unknown): Promise<SaveResult> {
  const res = await call(method, path, body);
  if (!res) return { ok: false, reason: "error" };
  if (res.status === 401 || res.status === 403) return { ok: false, reason: "not-staff" };
  if (res.status === 400) {
    const parsed = (await res.json().catch(() => ({}))) as { fields?: Record<string, string> };
    return { ok: false, reason: "invalid", fields: parsed.fields };
  }
  if (!res.ok) return { ok: false, reason: "error" };
  const product = (await res.json()) as Product;
  refresh();
  return { ok: true, product };
}

export const createProduct = (input: ProductInput) => save("POST", "/admin/products", input);

export const updateProduct = (id: string, patch: Partial<ProductInput>) =>
  save("PATCH", `/admin/products/${encodeURIComponent(id)}`, patch);

export async function deleteProduct(id: string): Promise<DeleteResult> {
  const res = await call("DELETE", `/admin/products/${encodeURIComponent(id)}`);
  if (!res) return { ok: false, reason: "error" };
  if (res.status === 401 || res.status === 403) return { ok: false, reason: "not-staff" };
  if (!res.ok) return { ok: false, reason: "error" };
  refresh();
  return { ok: true };
}
