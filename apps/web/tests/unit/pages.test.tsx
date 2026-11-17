import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

vi.mock("@/lib/catalogue", () => ({
  getCategories: vi.fn(),
  getCategory: vi.fn(),
  getProducts: vi.fn(),
  getProduct: vi.fn(),
  searchCatalogue: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import Home from "@/app/page";
import CategoriesPage from "@/app/categories/page";
import CategoryPage from "@/app/categories/[slug]/page";
import ProductsPage from "@/app/products/page";
import ProductPage from "@/app/products/[slug]/page";
import SearchPage, { generateMetadata as searchMetadata } from "@/app/search/page";
import * as api from "@/lib/catalogue";

const product = (id: number, name: string) => ({
  id,
  slug: `p-${id}`,
  name,
  brand: "Brand",
  description: "Desc",
  priceCents: 1000,
  currency: "INR",
  imageUrl: null,
  categoryId: 1,
  featured: true,
});
const category = (id: number, name: string) => ({
  id,
  slug: `c-${id}`,
  name,
  parentId: null,
  sortOrder: id,
});

const products = [product(1, "Shirt"), product(2, "Jeans")];
const categories = [category(1, "Men"), category(2, "Women")];

beforeEach(() => {
  vi.mocked(api.getProducts).mockResolvedValue(products);
  vi.mocked(api.getCategories).mockResolvedValue(categories);
  vi.mocked(api.getCategory).mockResolvedValue(categories[0]);
  vi.mocked(api.getProduct).mockResolvedValue(products[0]);
  vi.mocked(api.searchCatalogue).mockResolvedValue({ products, categories });
});

describe("server-rendered catalogue pages", () => {
  it("Home renders h1, featured products and category cards", async () => {
    render(await Home());
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByTestId("product-card")).toHaveLength(2);
    expect(screen.getAllByTestId("category-card")).toHaveLength(2);
  });

  it("Home shows the empty message with a Shop link", async () => {
    vi.mocked(api.getProducts).mockResolvedValue([]);
    vi.mocked(api.getCategories).mockResolvedValue([]);
    render(await Home());
    expect(screen.getByRole("link", { name: "Shop" })).toHaveAttribute("href", "/products");
  });

  it("Home shows the error state with a Try again link", async () => {
    vi.mocked(api.getProducts).mockRejectedValue(new Error("down"));
    render(await Home());
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/");
  });

  it("Categories renders h1 and category cards", async () => {
    render(await CategoriesPage());
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByTestId("category-card")).toHaveLength(2);
  });

  it("Listing renders h1 and products", async () => {
    render(await ProductsPage());
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByTestId("product-card")).toHaveLength(2);
  });

  it("Category page renders its name as h1 with products", async () => {
    render(await CategoryPage({ params: Promise.resolve({ slug: "c-1" }) }));
    expect(screen.getByRole("heading", { level: 1, name: "Men" })).toBeInTheDocument();
    expect(screen.getAllByTestId("product-card")).toHaveLength(2);
  });

  it("Category page 404s when absent", async () => {
    vi.mocked(api.getCategory).mockResolvedValue(null);
    await expect(CategoryPage({ params: Promise.resolve({ slug: "x" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("Product detail renders name, brand, price and description", async () => {
    render(await ProductPage({ params: Promise.resolve({ slug: "p-1" }) }));
    expect(screen.getByRole("heading", { level: 1, name: "Shirt" })).toBeInTheDocument();
    expect(screen.getByText("Brand")).toBeInTheDocument();
    expect(screen.getByText("Desc")).toBeInTheDocument();
  });

  it("Product detail 404s when absent", async () => {
    vi.mocked(api.getProduct).mockResolvedValue(null);
    await expect(ProductPage({ params: Promise.resolve({ slug: "x" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("Search renders h1 and matches", async () => {
    render(await SearchPage({ searchParams: Promise.resolve({ q: "shirt" }) }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Search results for shirt" }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("product-card")).toHaveLength(2);
    expect(screen.getAllByTestId("category-card")).toHaveLength(2);
  });

  it("Search canonical is /search with the q param", async () => {
    const m = await searchMetadata({ searchParams: Promise.resolve({ q: "red shirt" }) });
    expect(m.alternates?.canonical).toBe("/search?q=red%20shirt");
  });
});
