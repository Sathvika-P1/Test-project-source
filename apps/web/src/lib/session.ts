import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: "shopper" | "admin";
}

const API_URL = process.env.API_URL ?? "http://localhost:3000";

/** Server-side call to the Shop API that forwards the shopper's session cookie. */
export async function apiFetch(path: string): Promise<Response> {
  const sid = (await cookies()).get("sid")?.value;
  return fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: sid ? { cookie: `sid=${encodeURIComponent(sid)}` } : {},
  });
}

/** The signed-in user, or null. The API checks the session on every call, so a signed-out cookie is rejected. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const res = await apiFetch("/auth/me");
  if (!res.ok) return null;
  return ((await res.json()) as { user: CurrentUser }).user;
}

export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return user;
}
