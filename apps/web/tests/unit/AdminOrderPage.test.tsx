import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withSupport, withoutSupport } from "./orderFixtures";

vi.mock("next/headers", () => ({ cookies: async () => ({ toString: () => "sid=abc" }) }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/lib/adminOrders", () => ({ getOrders: vi.fn(), getOrder: vi.fn() }));
vi.mock("@/app/admin/orders/actions", () => ({ saveStatus: vi.fn(), cancelOrder: vi.fn() }));

import OrderPage from "@/app/admin/orders/[id]/page";
import { getOrder } from "@/lib/adminOrders";

const mocked = vi.mocked(getOrder);
const open = async (id: string) => render(await OrderPage({ params: Promise.resolve({ id }) }));

describe("Admin order page", () => {
  beforeEach(() => mocked.mockReset());
  afterEach(cleanup);

  it("AC2: shows the order's details", async () => {
    mocked.mockResolvedValue({ status: "ok", order: withSupport });
    await open("SW-10482");
    expect(mocked).toHaveBeenCalledWith("sid=abc", "SW-10482");
    expect(screen.getByRole("heading", { name: "Order SW-10482" })).toBeInTheDocument();
    expect(screen.getByText("12 Lake View Road, Indiranagar, Bengaluru 560038")).toBeInTheDocument();
    expect(screen.getByText("Paid by UPI")).toBeInTheDocument();
    expect(screen.getByText("Block-print cotton kurta")).toBeInTheDocument();
    expect(screen.getByText("arjun@example.com", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Placed 14 Nov 2026 by Arjun Rao/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to orders/ })).toHaveAttribute("href", "/admin/orders");
  });

  it("AC3: shows the support request beside the order", async () => {
    mocked.mockResolvedValue({ status: "ok", order: withSupport });
    await open("SW-10482");
    const aside = screen.getByRole("complementary", { name: "Support request" });
    expect(within(aside).getByText("Change delivery address")).toBeInTheDocument();
    expect(within(aside).getByText("Could you deliver to my office instead?")).toBeInTheDocument();
    expect(within(aside).getByText("From customer")).toBeInTheDocument();
  });

  it("AC4: shows no support request when there is none", async () => {
    mocked.mockResolvedValue({ status: "ok", order: withoutSupport });
    await open("SW-10477");
    expect(screen.queryByRole("complementary", { name: "Support request" })).toBeNull();
    expect(screen.queryByText(/support request/i)).toBeNull();
  });

  it("renders not found for an unknown order and an alert on failure", async () => {
    mocked.mockResolvedValue({ status: "not-found" });
    await expect(open("nope")).rejects.toThrow("NEXT_NOT_FOUND");
    mocked.mockResolvedValue({ status: "error" });
    await open("SW-10482");
    expect(screen.getByText("Couldn't load this order")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/admin/orders/SW-10482");
  });
});
