import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { summaries } from "./orderFixtures";

vi.mock("next/headers", () => ({ cookies: async () => ({ toString: () => "sid=abc" }) }));
vi.mock("@/lib/adminOrders", () => ({ getOrders: vi.fn(), getOrder: vi.fn() }));

import OrdersPage from "@/app/admin/orders/page";
import { getOrders } from "@/lib/adminOrders";

const mocked = vi.mocked(getOrders);

describe("Admin orders page", () => {
  beforeEach(() => mocked.mockReset());
  afterEach(cleanup);

  it("AC1: lists one row per order with status, support marker and a link", async () => {
    mocked.mockResolvedValue({ status: "ok", orders: summaries });
    render(await OrdersPage());
    expect(mocked).toHaveBeenCalledWith("sid=abc");
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Open order SW-10482" })).toHaveAttribute("href", "/admin/orders/SW-10482");
    expect(screen.getByText("2 orders")).toBeInTheDocument();
    expect(screen.getAllByText("Placed")).toHaveLength(2); // column header + badge
    expect(screen.getByText("Packed")).toBeInTheDocument();
    expect(screen.getAllByText("Support request")).toHaveLength(1);
    expect(screen.getByText("None")).toBeInTheDocument();
    expect(screen.getAllByText("14 Nov 2026").length).toBeGreaterThan(0);
  });

  it("AC1: shows an empty state when there are no orders", async () => {
    mocked.mockResolvedValue({ status: "ok", orders: [] });
    render(await OrdersPage());
    expect(screen.getByRole("heading", { name: "No orders yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to products" })).toHaveAttribute("href", "/admin/products");
  });

  it("AC1: shows an error with a retry when the list can't load", async () => {
    mocked.mockResolvedValue({ status: "error" });
    render(await OrdersPage());
    expect(screen.getByText("Couldn't load orders")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/admin/orders");
  });
});
