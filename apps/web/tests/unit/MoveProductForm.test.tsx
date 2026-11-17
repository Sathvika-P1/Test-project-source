import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/admin/categories/actions", () => ({
  addSubcategory: vi.fn(),
  renameSubcategory: vi.fn(),
  removeSubcategory: vi.fn(),
  moveProduct: vi.fn(async () => ({ ok: true })),
}));

import * as actions from "@/app/admin/categories/actions";
import { MoveProductForm } from "@/components/admin/MoveProductForm";
import type { AdminProduct, AdminTop } from "@/lib/catalogApi";

const tops: AdminTop[] = [
  {
    id: 1,
    name: "Men",
    slug: "men",
    subcategories: [
      { id: 10, name: "Shirts", productCount: 1 },
      { id: 11, name: "Formal Shirts", productCount: 0 },
    ],
  },
  { id: 2, name: "Women", slug: "women", subcategories: [{ id: 20, name: "Kurtas", productCount: 0 }] },
];
const products: AdminProduct[] = [
  {
    id: 1,
    name: "Oxford shirt, white",
    brand: "Harbour",
    topSlug: "men",
    topName: "Men",
    subcategoryId: 10,
    subcategoryName: "Shirts",
  },
];

describe("MoveProductForm", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("shows where the product is now and lists products by sub-category", () => {
    render(<MoveProductForm tops={tops} products={products} />);
    expect(screen.getByText("Currently in Shirts.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Men products by sub-category" })).toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveTextContent("Oxford shirt, white");
  });

  it("AC3: saves a move to another sub-category", async () => {
    render(<MoveProductForm tops={tops} products={products} />);
    fireEvent.change(screen.getByLabelText("Sub-category"), { target: { value: "11" } });
    fireEvent.click(screen.getByRole("button", { name: "Save sub-category" }));
    await waitFor(() => expect(actions.moveProduct).toHaveBeenCalledWith(1, 11));
    expect(await screen.findByText("Saved. Oxford shirt, white is now in Formal Shirts")).toBeInTheDocument();
  });

  it("AC4: a cleared sub-category is refused with the inline error and alert, and nothing is sent", () => {
    render(<MoveProductForm tops={tops} products={products} />);
    fireEvent.change(screen.getByLabelText("Sub-category"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save sub-category" }));
    expect(screen.getByText("Choose a sub-category. Every product needs one.")).toBeInTheDocument();
    expect(screen.getByText("Not saved")).toBeInTheDocument();
    expect(actions.moveProduct).not.toHaveBeenCalled();
  });

  it("shows the Not saved alert when the server refuses", async () => {
    vi.mocked(actions.moveProduct).mockResolvedValueOnce({ ok: false, error: "subcategory_required" });
    render(<MoveProductForm tops={tops} products={products} />);
    fireEvent.change(screen.getByLabelText("Sub-category"), { target: { value: "11" } });
    fireEvent.click(screen.getByRole("button", { name: "Save sub-category" }));
    expect(await screen.findByText("Not saved")).toBeInTheDocument();
  });
});
