import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/admin/categories/actions", () => ({
  addSubcategory: vi.fn(async () => ({ ok: true })),
  renameSubcategory: vi.fn(async () => ({ ok: true })),
  removeSubcategory: vi.fn(async () => ({ ok: true })),
  moveProduct: vi.fn(async () => ({ ok: true })),
}));

import * as actions from "@/app/admin/categories/actions";
import { CategoryManager } from "@/components/admin/CategoryManager";
import type { AdminTop } from "@/lib/catalogApi";

// Minimal stand-in for user-event (not a dependency of this project).
const userEvent = {
  click: async (el: HTMLElement) => void fireEvent.click(el),
  clear: async (el: HTMLElement) => void fireEvent.change(el, { target: { value: "" } }),
  type: async (el: HTMLElement, text: string) =>
    void fireEvent.change(el, { target: { value: (el as HTMLInputElement).value + text } }),
};

const NAMES =["Men", "Women", "Kids", "Home", "Beauty", "GenZ", "Studio"];
const tops: AdminTop[] = NAMES.map((name, i) => ({
  id: i + 1,
  name,
  slug: name.toLowerCase(),
  subcategories:
    name === "Men"
      ? [
          { id: 1, name: "Shirts", productCount: 2 },
          { id: 2, name: "Jeans", productCount: 0 },
        ]
      : [],
}));

describe("CategoryManager", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("AC7: lists exactly the seven top-level categories in order", () => {
    render(<CategoryManager tops={tops} />);
    const group = screen.getByRole("group", { name: "Top-level categories" });
    expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual(NAMES);
  });

  it("AC8: offers no control to add, rename or remove a top-level category", () => {
    render(<CategoryManager tops={tops} />);
    expect(screen.queryByRole("button", { name: /add (top-level )?category/i })).toBeNull();
    const group = screen.getByRole("group", { name: "Top-level categories" });
    expect(within(group).queryByRole("button", { name: /rename|remove|delete/i })).toBeNull();
    expect(screen.getByRole("button", { name: "Add sub-category" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rename Shirts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Shirts" })).toBeInTheDocument();
  });

  it("shows the sub-categories of the chosen top and the empty state for one with none", async () => {
    render(<CategoryManager tops={tops} />);
    expect(screen.getByRole("heading", { name: "Men sub-categories" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Studio" }));
    expect(screen.getByText("No sub-categories under Studio yet")).toBeInTheDocument();
    expect(screen.getByText("Add the first one above.")).toBeInTheDocument();
  });

  it("AC1: adds a sub-category under the chosen top", async () => {
    render(<CategoryManager tops={tops} />);
    await userEvent.type(screen.getByLabelText("New sub-category"), "Sneakers");
    await userEvent.click(screen.getByRole("button", { name: "Add sub-category" }));
    await waitFor(() => expect(actions.addSubcategory).toHaveBeenCalledWith("men", "Sneakers"));
    expect(await screen.findByText("Added Sneakers under Men")).toBeInTheDocument();
  });

  it("refuses an empty add without calling the action", async () => {
    render(<CategoryManager tops={tops} />);
    await userEvent.click(screen.getByRole("button", { name: "Add sub-category" }));
    expect(screen.getByText("Enter a name, like Sneakers.")).toBeInTheDocument();
    const input = screen.getByLabelText("New sub-category");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveClass("is-invalid");
    expect(actions.addSubcategory).not.toHaveBeenCalled();
  });

  it("shows the duplicate error from the server", async () => {
    vi.mocked(actions.addSubcategory).mockResolvedValueOnce({ ok: false, error: "duplicate" });
    render(<CategoryManager tops={tops} />);
    await userEvent.type(screen.getByLabelText("New sub-category"), "shirts");
    await userEvent.click(screen.getByRole("button", { name: "Add sub-category" }));
    expect(await screen.findByText("shirts is already under Men. Use a different name.")).toBeInTheDocument();
  });

  it("AC2: renames through the modal", async () => {
    render(<CategoryManager tops={tops} />);
    await userEvent.click(screen.getByRole("button", { name: "Rename Shirts" }));
    const dialog = screen.getByRole("dialog", { name: "Rename sub-category" });
    const input = within(dialog).getByLabelText("New name");
    await userEvent.clear(input);
    await userEvent.type(input, "Formal Shirts");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save name" }));
    await waitFor(() => expect(actions.renameSubcategory).toHaveBeenCalledWith(1, "Formal Shirts"));
    expect(await screen.findByText("Renamed to Formal Shirts")).toBeInTheDocument();
  });

  it("refuses Remove on a sub-category with products, without a modal", async () => {
    render(<CategoryManager tops={tops} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove Shirts" }));
    expect(screen.getByText(/Can't remove Shirts: it has 2 products/)).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(actions.removeSubcategory).not.toHaveBeenCalled();
  });

  it("removes an empty sub-category after confirming", async () => {
    render(<CategoryManager tops={tops} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove Jeans" }));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove sub-category" }));
    await waitFor(() => expect(actions.removeSubcategory).toHaveBeenCalledWith(2));
  });
});
