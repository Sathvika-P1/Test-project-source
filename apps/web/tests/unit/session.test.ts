import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

describe("requireUser", () => {
  beforeEach(() => {
    redirect.mockClear();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
  });

  it("AC11 redirects a signed-out visitor to sign-in, keeping where they were going", async () => {
    const { requireUser } = await import("@/lib/session");
    await expect(requireUser("/checkout")).rejects.toThrow("redirect:/sign-in?next=%2Fcheckout");
  });

  it("AC5 treats a rejected session as signed out", async () => {
    const { getCurrentUser } = await import("@/lib/session");
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns the user when the API accepts the session", async () => {
    const user = { id: "1", name: "Asha", email: "a@example.com", role: "shopper" };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user }), { status: 200 })));
    const { requireUser } = await import("@/lib/session");
    expect(await requireUser("/account")).toEqual(user);
  });
});
