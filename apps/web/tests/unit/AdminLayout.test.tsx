import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => "sid=abc" }),
}));
vi.mock("@/lib/adminAccess", () => ({ getAdminAccess: vi.fn() }));
vi.mock("@/app/admin/admin.css", () => ({}));
vi.mock("@/lib/catalogueApi", async (orig) => ({
  ...(await orig<typeof import("@/lib/catalogueApi")>()),
  listProducts: async () => [],
}));

import AdminLayout from "@/app/admin/layout";
import AdminHome from "@/app/admin/page";
import ProductsPage from "@/app/admin/products/page";
import { getAdminAccess } from "@/lib/adminAccess";

const mocked = vi.mocked(getAdminAccess);

async function renderLayout() {
  render(await AdminLayout({ children: <AdminHome /> }));
}

describe("AdminLayout", () => {
  beforeEach(() => mocked.mockReset());
  afterEach(cleanup);

  it("AC1: shows the administration area to an admin", async () => {
    mocked.mockResolvedValue({ status: "admin", email: "meera@x.test" });
    await renderLayout();
    expect(screen.getByRole("heading", { name: /store administration/i })).toBeInTheDocument();
    expect(screen.getByText("Products and prices")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute("href", "/admin/products");
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(mocked).toHaveBeenCalledWith("sid=abc");
  });

  it("AC2: shows a neutral gate to a non-admin, with no admin labels", async () => {
    mocked.mockResolvedValue({ status: "not-admin" });
    await renderLayout();
    expect(screen.getByRole("heading", { name: "You can't open this page" })).toBeInTheDocument();
    expect(screen.queryByText("Admin")).toBeNull();
    expect(screen.queryByText("Products and prices")).toBeNull();
    expect(screen.queryByRole("heading", { name: /store administration/i })).toBeNull();
  });

  it("AC3: asks a signed-out visitor to sign in", async () => {
    mocked.mockResolvedValue({ status: "signed-out" });
    await renderLayout();
    expect(screen.getByRole("heading", { name: "Sign in to continue" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toContain("/admin");
    expect(screen.queryByText("Products and prices")).toBeNull();
  });

  it("AC4: a child admin page carries no role check of its own", async () => {
    render(await ProductsPage());
    expect(screen.getByRole("heading", { name: "Products" })).toBeInTheDocument();
    expect(mocked).not.toHaveBeenCalled();
  });

  it("AC4: an admin opening another page is checked once, by the layout", async () => {
    mocked.mockResolvedValue({ status: "admin", email: "meera@x.test" });
    render(await AdminLayout({ children: await ProductsPage() }));
    expect(screen.getByRole("heading", { name: "Products" })).toBeInTheDocument();
    expect(mocked).toHaveBeenCalledTimes(1);
  });
});
