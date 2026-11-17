import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ toString: () => "sid=abc" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/admin/products/actions", () => ({ deleteProduct: vi.fn() }));
vi.mock("@/lib/catalogueApi", async (orig) => ({
  ...(await orig<typeof import("@/lib/catalogueApi")>()),
  listProducts: vi.fn(),
}));

import AdminProducts from "@/app/admin/products/page";
import ProductsError from "@/app/admin/products/error";
import { listProducts } from "@/lib/catalogueApi";

afterEach(cleanup);

describe("admin products list", () => {
  it("lists name, brand, sub-category, sizes and price", async () => {
    vi.mocked(listProducts).mockResolvedValue([
      {
        id: "p1",
        name: "Linen shirt",
        brand: "Harbour",
        description: "d",
        subCategoryId: "s1",
        subCategory: { id: "s1", topLevel: "Men", name: "Shirts" },
        price: 1599,
        sizes: ["M"],
        images: ["a.jpg"],
      },
    ]);
    render(await AdminProducts());
    expect(screen.getByText("Linen shirt")).toBeInTheDocument();
    expect(screen.getByText("Harbour")).toBeInTheDocument();
    expect(screen.getByText("Men / Shirts")).toBeInTheDocument();
    expect(screen.getByText("Sizes: M")).toBeInTheDocument();
    expect(screen.getByText(/1,599/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit Linen shirt" })).toHaveAttribute("href", "/admin/products/p1/edit");
  });

  it("shows the empty state", async () => {
    vi.mocked(listProducts).mockResolvedValue([]);
    render(await AdminProducts());
    expect(screen.getByText("No products yet")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Add product" })).toHaveLength(2);
  });

  it("error boundary offers Retry", () => {
    const reset = vi.fn();
    render(<ProductsError error={new Error("x")} reset={reset} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Products didn't load");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
