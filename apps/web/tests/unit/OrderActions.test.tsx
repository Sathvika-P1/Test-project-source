import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/admin/orders/actions", () => ({ saveStatus: vi.fn(), cancelOrder: vi.fn() }));

import { cancelOrder, saveStatus } from "@/app/admin/orders/actions";
import { OrderActions } from "@/components/admin/OrderActions";

const order = { id: "SW-10482", status: "placed" as const };
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

describe("OrderActions", () => {
  beforeEach(() => {
    vi.mocked(saveStatus).mockReset().mockResolvedValue({ ok: true, status: "shipped" });
    vi.mocked(cancelOrder).mockReset().mockResolvedValue({ ok: true });
  });
  afterEach(cleanup);

  it("AC5: saves the chosen status and shows it", async () => {
    render(<OrderActions order={order} />);
    fireEvent.change(screen.getByLabelText("Set status"), { target: { value: "shipped" } });
    click("Save status");
    expect(saveStatus).toHaveBeenCalledWith("SW-10482", "shipped");
    expect(await screen.findByText("Status saved: Shipped")).toBeInTheDocument();
    expect(within(screen.getByTestId("current-status")).getByText("Shipped")).toBeInTheDocument();
  });

  it("AC5: tells staff to try again when saving fails", async () => {
    vi.mocked(saveStatus).mockResolvedValue({ ok: false, reason: "error" });
    render(<OrderActions order={order} />);
    click("Save status");
    expect(await screen.findByRole("alert")).toHaveTextContent(/try again/i);
  });

  it("AC6: cancelling asks for confirmation, then cancels", async () => {
    render(<OrderActions order={order} />);
    click("Cancel order");
    const dialog = screen.getByRole("dialog", { name: "Cancel order SW-10482?" });
    expect(cancelOrder).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel order" }));
    expect(cancelOrder).toHaveBeenCalledWith("SW-10482");
    expect(await screen.findByText("Order cancelled")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/status can no longer change/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel order" })).toBeNull();
  });

  it("AC6: keeping the order closes the dialog without cancelling; Esc also closes", () => {
    render(<OrderActions order={order} />);
    click("Cancel order");
    click("Keep order");
    expect(screen.queryByRole("dialog")).toBeNull();
    click("Cancel order");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(cancelOrder).not.toHaveBeenCalled();
  });

  it("AC6: a cancelled order has no form and no cancel button", () => {
    render(<OrderActions order={{ ...order, status: "cancelled" }} />);
    expect(screen.queryByRole("button", { name: "Cancel order" })).toBeNull();
    expect(screen.queryByLabelText("Set status")).toBeNull();
    expect(screen.getByText(/status can no longer change/i)).toBeInTheDocument();
  });
});
