import { describe, expect, it, vi } from "vitest";
import { getAdminAccess } from "@/lib/adminAccess";

const respond = (status: number, body: unknown = {}) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe("getAdminAccess", () => {
  it("returns admin on 200 and forwards the session cookie", async () => {
    const fetchImpl = respond(200, { role: "admin", email: "meera@x.test" });
    const access = await getAdminAccess("sid=abc", fetchImpl as unknown as typeof fetch);
    expect(access).toEqual({ status: "admin", email: "meera@x.test" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/admin\/access$/);
    expect((init.headers as Record<string, string>).cookie).toBe("sid=abc");
  });

  it("returns not-admin on 403", async () => {
    expect(await getAdminAccess("sid=abc", respond(403) as unknown as typeof fetch)).toEqual({
      status: "not-admin",
    });
  });

  it("returns signed-out on 401", async () => {
    expect(await getAdminAccess(null, respond(401) as unknown as typeof fetch)).toEqual({
      status: "signed-out",
    });
  });

  it("denies on a 500", async () => {
    const access = await getAdminAccess("sid=abc", respond(500) as unknown as typeof fetch);
    expect(access.status).not.toBe("admin");
  });

  it("denies when the request throws", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("down");
    });
    const access = await getAdminAccess("sid=abc", fetchImpl as unknown as typeof fetch);
    expect(access.status).not.toBe("admin");
  });

  it("denies a 200 without an email", async () => {
    const access = await getAdminAccess("sid=abc", respond(200, {}) as unknown as typeof fetch);
    expect(access.status).not.toBe("admin");
  });
});
