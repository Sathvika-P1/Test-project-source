import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/shop/shop.css", () => ({}));
vi.mock("@/lib/catalogueApi", async (orig) => ({
  ...(await orig<typeof import("@/lib/catalogueApi")>()),
  listPublicSubCategories: vi.fn(),
  listPublicProducts: vi.fn(),
}));

import ShopPage from "@/app/shop/page";
import { listPublicProducts, listPublicSubCategories } from "@/lib/catalogueApi";

const subs = [
  { id: "s1", topLevel: "Men", name: "Shirts" },
  { id: "s2", topLevel: "Home", name: "Cushions" },
];
const product = {
  id: "p1",
  name: "Linen shirt",
  brand: "Harbour",
  description: "d",
  subCategoryId: "s1",
  subCategory: subs[0],
  price: 1599,
  sizes: ["M", "L"],
  images: ["a.jpg"],
};

async function renderShop(sub?: string) {
  render(await ShopPage({ searchParams: Promise.resolve(sub ? { sub } : {}) }));
}

describe("ShopPage", () => {
  beforeEach(() => vi.mocked(listPublicSubCategories).mockResolvedValue(subs));
  afterEach(cleanup);

  it("AC1/3/4: renders products from the API with brand, sizes and INR price", async () => {
    vi.mocked(listPublicProducts).mockResolvedValue([product] as never);
    await renderShop("s1");
    expect(listPublicProducts).toHaveBeenCalledWith("s1");
    expect(screen.getByText("Linen shirt")).toBeInTheDocument();
    expect(screen.getByText("Harbour, sizes M, L")).toBeInTheDocument();
    expect(screen.getByText(/1,599/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Men \/ Shirts/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("AC5: an empty sub-category says so", async () => {
    vi.mocked(listPublicProducts).mockResolvedValue([]);
    await renderShop("s2");
    expect(screen.getByText("No products in this sub-category.")).toBeInTheDocument();
  });
});
