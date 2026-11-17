import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { config, middleware } from "@/middleware";

const reply = (status: number, body: unknown = {}) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe("admin middleware", () => {
  it("matches every path under /admin", () => {
    expect(config.matcher).toContain("/admin/:path*");
  });

  it("lets an admin through", async () => {
    vi.stubGlobal("fetch", reply(200, { role: "admin", email: "a@x.test" }));
    const res = await middleware(new NextRequest("http://localhost/admin/products"));
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it.each([[401], [403], [500]])("rewrites to the denied page on %i", async (status) => {
    vi.stubGlobal("fetch", reply(status));
    const res = await middleware(new NextRequest("http://localhost/admin/products"));
    expect(res.headers.get("x-middleware-rewrite")).toBe("http://localhost/admin/denied");
  });

  it("denies when the API is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await middleware(new NextRequest("http://localhost/admin"));
    expect(res.headers.get("x-middleware-rewrite")).toBe("http://localhost/admin/denied");
  });
});
