"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export const NAV_ITEMS = [
  { key: "home", label: "Home", href: "/" },
  { key: "shop", label: "Shop", href: "/shop" },
  { key: "account", label: "Account", href: "/account" },
  { key: "wishlist", label: "Saved", href: "/wishlist" },
  { key: "cart", label: "Bag", href: "/cart" },
] as const;

const GROUPS = [NAV_ITEMS.slice(0, 2), NAV_ITEMS.slice(2)];

function isCurrent(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function TopBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";

  return (
    <header className="shell-header">
      <div className="container shell-bar">
        <Link className="shell-brand" href="/">
          Shopping Website
        </Link>
        <button
          type="button"
          className="btn btn-secondary btn-sm shell-menu-btn"
          aria-label="Menu"
          aria-controls="main-nav"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          Menu
        </button>
        <nav id="main-nav" className="shell-nav" aria-label="Main" hidden={!open}>
          {GROUPS.map((group) => (
            <div className="shell-nav-group" key={group[0].key}>
              {group.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  data-nav-key={item.key}
                  aria-current={isCurrent(item.href, pathname) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </header>
  );
}
