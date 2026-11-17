"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  apiAddSubcategory,
  apiMoveProduct,
  apiRemoveSubcategory,
  apiRenameSubcategory,
  type WriteResult,
} from "@/lib/catalogApi";

// No role logic here: the Shop API's admin hook decides, and the admin layout gates the pages.
async function cookieHeader(): Promise<string | null> {
  return (await cookies()).toString() || null;
}

function refresh(result: WriteResult): WriteResult {
  if (result.ok) {
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products/move");
    revalidatePath("/category/[slug]", "page");
  }
  return result;
}

export async function addSubcategory(topSlug: string, name: string): Promise<WriteResult> {
  return refresh(await apiAddSubcategory(await cookieHeader(), topSlug, name));
}

export async function renameSubcategory(id: number, name: string): Promise<WriteResult> {
  return refresh(await apiRenameSubcategory(await cookieHeader(), id, name));
}

export async function removeSubcategory(id: number): Promise<WriteResult> {
  return refresh(await apiRemoveSubcategory(await cookieHeader(), id));
}

export async function moveProduct(productId: number, subcategoryId: number | null): Promise<WriteResult> {
  return refresh(await apiMoveProduct(await cookieHeader(), productId, subcategoryId));
}
