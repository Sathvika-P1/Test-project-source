import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/admin/products/actions", () => ({
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { createProduct } from "@/app/admin/products/actions";
import { ProductForm } from "@/components/admin/ProductForm";

const subCategories = [
  { id: "sub-1", topLevel: "Men", name: "Shirts" },
  { id: "sub-2", topLevel: "Home", name: "Cushions" },
];
const create = vi.mocked(createProduct);

function fill(sub: string | null) {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Linen shirt" } });
  fireEvent.change(screen.getByLabelText("Brand"), { target: { value: "Harbour" } });
  fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Breathable" } });
  if (sub) fireEvent.change(screen.getByLabelText("Sub-category"), { target: { value: sub } });
  fireEvent.change(screen.getByLabelText("Price (₹)"), { target: { value: "1599" } });
  fireEvent.click(screen.getByLabelText("M"));
  fireEvent.change(screen.getByLabelText("Image 1 URL"), { target: { value: "https://x.test/shirt.jpg" } });
}

describe("ProductForm", () => {
  beforeEach(() => create.mockReset());
  afterEach(cleanup);

  it("AC1: a fully filled form calls createProduct with the typed values", async () => {
    create.mockResolvedValue({ ok: true, product: {} as never });
    render(<ProductForm subCategories={subCategories} />);
    fill("sub-1");
    fireEvent.click(screen.getByRole("button", { name: "Save product" }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        name: "Linen shirt",
        brand: "Harbour",
        description: "Breathable",
        subCategoryId: "sub-1",
        price: 1599,
        sizes: ["M"],
        images: ["https://x.test/shirt.jpg"],
      }),
    );
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View on storefront" })).toHaveAttribute("href", "/shop");
  });

  it("AC2: no sub-category shows the inline error, keeps values and never calls the action", () => {
    render(<ProductForm subCategories={subCategories} />);
    fill(null);
    fireEvent.click(screen.getByRole("button", { name: "Save product" }));
    expect(screen.getByText("Choose a sub-category. A product can't be saved without one.")).toBeVisible();
    expect(screen.getByLabelText("Sub-category")).toHaveClass("is-invalid");
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Name")).toHaveValue("Linen shirt");
  });

  it("shows every other validation message on an empty form", () => {
    render(<ProductForm subCategories={subCategories} />);
    fireEvent.click(screen.getByRole("button", { name: "Save product" }));
    for (const msg of [
      "Enter a product name.",
      "Enter a brand.",
      "Add a short description.",
      "Enter a price like 1899.",
      "Pick at least one size.",
      "Add at least one image.",
    ]) {
      expect(screen.getByText(msg)).toBeVisible();
    }
    expect(screen.getByLabelText("Name")).toHaveFocus();
  });

  it("AC6: a not-staff result shows the Not saved alert", async () => {
    create.mockResolvedValue({ ok: false, reason: "not-staff" });
    render(<ProductForm subCategories={subCategories} />);
    fill("sub-1");
    fireEvent.click(screen.getByRole("button", { name: "Save product" }));
    expect(await screen.findByText("Not saved")).toBeInTheDocument();
    expect(screen.queryByText("Saved")).toBeNull();
  });
});
