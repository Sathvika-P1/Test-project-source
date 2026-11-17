import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/admin/products/actions", () => ({ deleteProduct: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { deleteProduct } from "@/app/admin/products/actions";
import { RemoveProductModal } from "@/components/admin/RemoveProductModal";

const del = vi.mocked(deleteProduct);
const onRemoved = vi.fn();

function open() {
  render(<RemoveProductModal product={{ id: "p1", name: "Linen shirt" }} onRemoved={onRemoved} />);
  fireEvent.click(screen.getByRole("button", { name: "Remove Linen shirt" }));
}

describe("RemoveProductModal", () => {
  beforeEach(() => {
    del.mockReset();
    onRemoved.mockReset();
  });
  afterEach(cleanup);

  it("names the product and says it can't be undone", () => {
    open();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Remove this product?")).toBeInTheDocument();
    expect(screen.getByText(/Linen shirt.*can't be undone/)).toBeInTheDocument();
  });

  it("Keep product closes without deleting, and Esc closes too", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Keep product" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(del).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Remove Linen shirt" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Remove Linen shirt" })).toHaveFocus();
  });

  it("AC5: Remove product calls deleteProduct once with the id, then toasts", async () => {
    del.mockResolvedValue({ ok: true });
    open();
    fireEvent.click(screen.getByRole("button", { name: "Remove product" }));
    await waitFor(() => expect(del).toHaveBeenCalledTimes(1));
    expect(del).toHaveBeenCalledWith("p1");
    await waitFor(() => expect(onRemoved).toHaveBeenCalledWith("Linen shirt"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("AC6: a not-staff result is shown and nothing is reported removed", async () => {
    del.mockResolvedValue({ ok: false, reason: "not-staff" });
    open();
    fireEvent.click(screen.getByRole("button", { name: "Remove product" }));
    expect(await screen.findByText("Not saved")).toBeInTheDocument();
    expect(onRemoved).not.toHaveBeenCalled();
  });
});
