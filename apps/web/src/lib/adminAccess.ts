export type AdminAccess =
  | { status: "admin"; email: string }
  | { status: "not-admin" }
  | { status: "signed-out" };

const DEFAULT_API_BASE_URL = "http://localhost:3000";

/**
 * Asks the Shop API whether the shopper session in `cookieHeader` is an admin.
 * Fails closed: any error, unexpected status or malformed body denies access.
 */
export async function getAdminAccess(
  cookieHeader: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<AdminAccess> {
  const base = process.env.API_BASE_URL ?? DEFAULT_API_BASE_URL;
  try {
    const res = await fetchImpl(`${base}/admin/access`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    });
    if (res.status === 401) return { status: "signed-out" };
    if (res.status === 200) {
      const body = (await res.json()) as { role?: string; email?: unknown };
      if (body.role === "admin" && typeof body.email === "string") {
        return { status: "admin", email: body.email };
      }
    }
    return { status: "not-admin" };
  } catch (err) {
    console.error("admin access check failed; denying", err);
    return { status: "not-admin" };
  }
}
