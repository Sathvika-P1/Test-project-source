"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

export type NavKey = "home" | "shop" | "account" | "wishlist" | "cart";

const GROUPS: { id: string; links: { key: NavKey; label: string; href: string }[] }[] = [
  {
    id: "browse",
    links: [
      { key: "home", label: "Home", href: "/" },
      { key: "shop", label: "Shop", href: "/shop" },
    ],
  },
  {
    id: "personal",
    links: [
      { key: "account", label: "Account", href: "/account" },
      { key: "wishlist", label: "Saved", href: "/saved" },
      { key: "cart", label: "Bag", href: "/bag" },
    ],
  },
];

export function SiteShell({ active, children }: { active?: NavKey; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="shell">
      <header className="shell-header">
        <div className="container shell-bar">
          <Link className="shell-brand" href="/">
            Shopping Website
          </Link>
          <button
            type="button"
            className="btn btn-secondary btn-sm shell-menu-btn"
            aria-controls="main-nav"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            Menu
          </button>
          <nav id="main-nav" className="shell-nav" aria-label="Main" hidden={!open}>
            {GROUPS.map((g) => (
              <div className="shell-nav-group" key={g.id}>
                {g.links.map((l) => (
                  <Link
                    key={l.key}
                    href={l.href}
                    data-nav-key={l.key}
                    aria-current={active === l.key ? "page" : undefined}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>
      </header>
      <main className="container shell-main">{children}</main>
      <footer className="shell-footer">
        <div className="container">&copy; Shopping Website</div>
      </footer>
    </div>
  );
}
