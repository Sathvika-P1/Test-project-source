import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => "sid=abc" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from "next/cache";
import { createProduct, deleteProduct, updateProduct } from "@/app/admin/products/actions";
import type { ProductInput } from "@/lib/catalogueApi";

const input: ProductInput = {
  name: "Linen shirt",
  brand: "Harbour",
  description: "Breathable",
  subCategoryId: "sub-1",
  price: 1599,
  sizes: ["M"],
  images: ["shirt.jpg"],
};
const fetchMock = vi.fn();

describe("product actions", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.mocked(revalidatePath).mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([401, 403])("AC6: a %s from the API is a not-staff result and never revalidates", async (status) => {
    fetchMock.mockResolvedValue(new Response('{"error":"forbidden"}', { status }));
    const notStaff = { ok: false, reason: "not-staff" };
    expect(await createProduct(input)).toEqual(notStaff);
    expect(await updateProduct("p1", { price: 1 })).toEqual(notStaff);
    expect(await deleteProduct("p1")).toEqual(notStaff);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("AC1: create forwards the cookie, then revalidates the storefront and admin list", async () => {
    const product = { ...input, id: "p1" };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(product), { status: 201 }));
    expect(await createProduct(input)).toEqual({ ok: true, product });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/admin\/products$/);
    expect(init.method).toBe("POST");
    expect(init.headers.cookie).toBe("sid=abc");
    expect(revalidatePath).toHaveBeenCalledWith("/shop");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products");
  });

  it("AC2: a 400 maps to field errors", async () => {
    fetchMock.mockResolvedValue(
      new Response('{"error":"invalid","fields":{"subCategoryId":"unknown sub-category"}}', { status: 400 }),
    );
    expect(await createProduct(input)).toEqual({
      ok: false,
      reason: "invalid",
      fields: { subCategoryId: "unknown sub-category" },
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("AC3: update sends a PATCH with only the changed fields", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ...input, id: "p1" }), { status: 200 }));
    await updateProduct("p1", { price: 1799 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/admin\/products\/p1$/);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ price: 1799 });
  });

  it("AC5: delete succeeds on 204 and revalidates", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await deleteProduct("p1")).toEqual({ ok: true });
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
    expect(revalidatePath).toHaveBeenCalledWith("/shop");
  });

  it("a network failure is a generic error", async () => {
    fetchMock.mockRejectedValue(new Error("down"));
    expect(await deleteProduct("p1")).toEqual({ ok: false, reason: "error" });
  });
});
