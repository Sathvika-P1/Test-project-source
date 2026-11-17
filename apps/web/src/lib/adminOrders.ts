export type OrderStatus = "placed" | "packed" | "shipped" | "delivered" | "cancelled";
export type SettableStatus = Exclude<OrderStatus, "cancelled">;

export interface OrderSummary {
  id: string;
  customer: string;
  placedAt: string;
  status: OrderStatus;
  hasSupportRequest: boolean;
  total: number;
  currency: string;
}

export interface SupportRequest {
  subject: string;
  message: string;
  sentAt: string;
}

export interface OrderDetail extends OrderSummary {
  email: string;
  address: string;
  payment: string;
  items: { name: string; detail: string; price: number }[];
  supportRequest: SupportRequest | null;
}

export type OrdersResult = { status: "ok"; orders: OrderSummary[] } | { status: "error" };
export type OrderResult =
  | { status: "ok"; order: OrderDetail }
  | { status: "not-found" }
  | { status: "error" };

const DEFAULT_API_BASE_URL = "http://localhost:3000";

export function apiBaseUrl(): string {
  return process.env.API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

/** Fails closed: any error, unexpected status or malformed body is an `error` result. */
export async function getOrders(
  cookieHeader: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<OrdersResult> {
  try {
    const res = await fetchImpl(`${apiBaseUrl()}/admin/orders`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    });
    if (res.status !== 200) return { status: "error" };
    const body = (await res.json()) as { orders?: unknown };
    if (!Array.isArray(body.orders)) return { status: "error" };
    return { status: "ok", orders: body.orders as OrderSummary[] };
  } catch (err) {
    console.error("loading orders failed", err);
    return { status: "error" };
  }
}

export async function getOrder(
  cookieHeader: string | null,
  id: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrderResult> {
  try {
    const res = await fetchImpl(`${apiBaseUrl()}/admin/orders/${encodeURIComponent(id)}`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    });
    if (res.status === 404) return { status: "not-found" };
    if (res.status !== 200) return { status: "error" };
    const order = (await res.json()) as OrderDetail;
    if (typeof order?.id !== "string") return { status: "error" };
    return { status: "ok", order };
  } catch (err) {
    console.error("loading order failed", err);
    return { status: "error" };
  }
}
