"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { apiBaseUrl, type OrderStatus, type SettableStatus } from "@/lib/adminOrders";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; reason: "cancelled" | "error" };

async function call(path: string, method: "PATCH" | "POST", body?: unknown): Promise<Response | null> {
  const cookieHeader = (await cookies()).toString();
  try {
    return await fetch(`${apiBaseUrl()}${path}`, {
      method,
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch (err) {
    console.error("order update failed", err);
    return null;
  }
}

function refresh(id: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}

export async function saveStatus(
  id: string,
  status: SettableStatus,
): Promise<ActionResult<{ status: OrderStatus }>> {
  const res = await call(`/admin/orders/${encodeURIComponent(id)}/status`, "PATCH", { status });
  if (res?.status === 409) return { ok: false, reason: "cancelled" };
  if (res?.status !== 200) return { ok: false, reason: "error" };
  refresh(id);
  return { ok: true, status };
}

export async function cancelOrder(id: string): Promise<ActionResult> {
  const res = await call(`/admin/orders/${encodeURIComponent(id)}/cancel`, "POST");
  if (res?.status !== 200) return { ok: false, reason: "error" };
  refresh(id);
  return { ok: true };
}
