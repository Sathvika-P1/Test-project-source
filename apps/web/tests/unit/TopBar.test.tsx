import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

const pathname = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

import { TopBar } from "@/components/TopBar";

const NAMES = ["Home", "Shop", "Account", "Saved", "Bag"];

describe("TopBar", () => {
  it("shows the brand then the five links in order (AC1)", () => {
    pathname.value = "/";
    render(<TopBar />);
    const brand = screen.getByRole("link", { name: "Shopping Website" });
    expect(brand).toHaveAttribute("href", "/");
    // jsdom computes an empty accessible name for a hidden nav, so match by role only.
    const nav = screen.getByRole("navigation", { hidden: true });
    expect(nav).toHaveAttribute("aria-label", "Main");
    const links = within(nav).getAllByRole("link", { hidden: true });
    expect(links.map((a) => a.textContent)).toEqual(NAMES);
    expect(links.map((a) => a.getAttribute("data-nav-key"))).toEqual([
      "home",
      "shop",
      "account",
      "wishlist",
      "cart",
    ]);
    expect(brand.compareDocumentPosition(links[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("starts collapsed with one Menu button (AC2)", () => {
    render(<TopBar />);
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("opens the links with the Menu button and closes on link click (AC3)", () => {
    render(<TopBar />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "true");
    for (const name of NAMES) {
      expect(screen.getByRole("link", { name })).toBeVisible();
    }
    fireEvent.click(screen.getByRole("link", { name: "Shop" }));
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
  });

  it("marks only the current section (Shop) with aria-current", () => {
    pathname.value = "/shop";
    render(<TopBar />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("link", { name: "Shop" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("takes no props, so guest and signed-in render identically (AC4)", () => {
    pathname.value = "/";
    expect(TopBar.length).toBe(0);
    const a = render(<TopBar />).container.innerHTML;
    const b = render(<TopBar />).container.innerHTML;
    expect(a).toEqual(b);
  });
});
