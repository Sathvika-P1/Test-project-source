import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("@/lib/catalogApi", () => ({ getShopCategory: vi.fn(), getShopTops: vi.fn() }));
vi.mock("@/app/catalog.css", () => ({}));

import CategoryPage from "@/app/category/[slug]/page";
import { CategoryCards } from "@/components/CategoryCards";
import { getShopCategory, getShopTops } from "@/lib/catalogApi";

afterEach(cleanup);

describe("CategoryCards", () => {
  it("AC5: shows a Shop by category card for each sub-category", () => {
    render(<CategoryCards top="Men" subcategories={[{ id: 1, name: "Sneakers" }]} />);
    expect(screen.getByText("Sneakers")).toBeInTheDocument();
  });

  it("AC6: shows only the renamed card", () => {
    render(<CategoryCards top="Men" subcategories={[{ id: 1, name: "Formal Shirts" }]} />);
    expect(screen.getByText("Formal Shirts")).toBeInTheDocument();
    expect(screen.queryByText("Shirts")).not.toBeInTheDocument();
  });

  it("shows the empty state when there are none", () => {
    render(<CategoryCards top="Studio" subcategories={[]} />);
    expect(screen.getByText("No categories to shop yet")).toBeInTheDocument();
    expect(screen.getByText("Check back soon, or browse everything in Shop.")).toBeInTheDocument();
  });
});

describe("category page", () => {
  it("calls notFound for an unknown slug", async () => {
    vi.mocked(getShopCategory).mockResolvedValue(null);
    vi.mocked(getShopTops).mockResolvedValue([]);
    await expect(CategoryPage({ params: Promise.resolve({ slug: "nope" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders the top name, the seven chip links and the cards", async () => {
    const names = ["Men", "Women", "Kids", "Home", "Beauty", "GenZ", "Studio"];
    vi.mocked(getShopTops).mockResolvedValue(names.map((name, i) => ({ id: i, name, slug: name.toLowerCase() })));
    vi.mocked(getShopCategory).mockResolvedValue({
      top: { id: 0, name: "Men", slug: "men" },
      subcategories: [{ id: 1, name: "Sneakers" }],
    });
    render(await CategoryPage({ params: Promise.resolve({ slug: "men" }) }));
    expect(screen.getByRole("heading", { level: 1, name: "Men" })).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(names);
    expect(screen.getByRole("link", { name: "Men" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Sneakers")).toBeInTheDocument();
  });
});
