import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteShell } from "@/components/SiteShell";

describe("SiteShell", () => {
  it("lists Home, Shop, Account, Saved, Bag in order with their nav keys", () => {
    const { container } = render(<SiteShell active="account">body</SiteShell>);
    const links = [...container.querySelectorAll("nav a")];
    expect(links.map((a) => a.textContent)).toEqual(["Home", "Shop", "Account", "Saved", "Bag"]);
    expect(links.map((a) => a.getAttribute("data-nav-key"))).toEqual(["home", "shop", "account", "wishlist", "cart"]);
    expect(container.textContent).not.toMatch(/cart|wishlist/i);
  });

  it("marks the active link and toggles the menu", () => {
    render(<SiteShell active="account">body</SiteShell>);
    expect(screen.getByRole("link", { name: "Account", hidden: true })).toHaveAttribute("aria-current", "page");
    const menu = screen.getByRole("button", { name: "Menu" });
    expect(menu).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");
  });
});
