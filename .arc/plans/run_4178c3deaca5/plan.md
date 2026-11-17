summary: |
  Add the app-wide top bar to the Next.js web app (apps/web): the brand "Shopping Website" (links home) followed by Home, Shop, Account, Saved and Bag in that order, rendered once in the root layout so every page gets it. At 48rem and above the links sit inline; below 48rem they are hidden and a single "Menu" button reveals them. The bar is identical for guests and signed-in shoppers (same six items, same order), so it needs no auth state. The work is a client component `TopBar`, the shell styles on design tokens, loading the design-system tokens into the app (the app does not load them today), and wiring the layout. Page content, footer, search and banner belong to other stories.
scope:
  - description: |
      Load the design tokens and the design-system component classes the approved prototype uses (`.container`, `.btn`, `.btn-secondary`, `.btn-sm`) into the app once, in its entry stylesheet, right after the Tailwind import:

      ```css
      @import "tailwindcss";
      @import "../../../../design-system/tokens.css";
      @import "../../../../design-system/prototype-utils.css";
      ```
      Then add the shell rules, copied from the prototype's `data-arc-shell-style` block and `design-system/app-shell.html`, below them: `.shell`, `.shell-header`, `.shell-bar`, `.shell-brand`, `.shell-nav`, `.shell-nav-group`, `.shell-main`, and the `@media (min-width: 48rem)` block that hides `.shell-menu-btn` and lays `.shell-nav` out as a row. Every colour, space, radius, font and border value uses a token (`--color-border`, `--color-bg`, `--color-bg-subtle`, `--color-fg`, `--color-primary`, `--space-1`, `--space-2`, `--space-4`, `--radius-md`, `--font-size-lg`, `--font-weight-bold`, `--font-weight-medium`, `--border-width`). No colour or px literal.
    files:
      - apps/web/src/app/globals.css
    rationale: |
      apps/web/src/app/globals.css currently contains only `@import "tailwindcss";` and layout.tsx imports it (line 2), so no token or design-system class is loaded yet. The design guideline says to add shell classes in `app-shell.html` and the app together, so the shell CSS is the same text as the file in design-system/.
  - description: |
      New client component `TopBar` (the nav items live in the same file). It matches the prototype markup exactly: `header.shell-header > div.container.shell-bar` containing `a.shell-brand` (href "/"), `button.btn.btn-secondary.btn-sm.shell-menu-btn` (text "Menu", `aria-label="Menu"`, `aria-controls="main-nav"`, `aria-expanded`), and `nav#main-nav.shell-nav[aria-label="Main"]` holding two `.shell-nav-group` divs: Home, Shop, then Account, Saved, Bag.

      ```tsx
      "use client";
      export const NAV_ITEMS = [
        { key: "home", label: "Home", href: "/" },
        { key: "shop", label: "Shop", href: "/shop" },
        { key: "account", label: "Account", href: "/account" },
        { key: "wishlist", label: "Saved", href: "/wishlist" },
        { key: "cart", label: "Bag", href: "/cart" },
      ] as const;
      export function TopBar(): JSX.Element;
      ```
      Behaviour: `const [open, setOpen] = useState(false)`; the nav has `hidden={!open}`; the button toggles it and sets `aria-expanded={open}`. At 48rem and above the CSS forces the nav to display regardless of `hidden`, and hides the button (prototype CSS). Each link carries `data-nav-key`; the link for the current section gets `aria-current="page"` using `usePathname()` (Home only on exactly "/", others on their href or a sub-path). Clicking a link closes the menu, because the layout persists across navigation. The component takes no props and reads no signed-in state, so guest and signed-in render the same six items.
    files:
      - apps/web/src/components/TopBar.tsx
    rationale: |
      Prototype (header and nav at its lines 1007-1024) and design-system/app-shell.html define this structure. Hero (apps/web/src/components/Hero.tsx) is the only catalogued component and is page content, so it is reused as-is, not extended. TopBar is the new shell component the story asks for. Interactivity (menu toggle, usePathname) needs a client component; the rest of the layout stays a server component.
  - description: |
      Wire the shell into the root layout: inside `<body>` render `<div className="shell"><TopBar /><main className="container shell-main">{children}</main></div>`. Keep the existing body classes and metadata. In `page.tsx`, replace the outer `<main>` with a fragment so there is one `<main>` landmark (the layout owns it); Hero and its props are unchanged.
    files:
      - apps/web/src/app/layout.tsx
      - apps/web/src/app/page.tsx
    rationale: |
      The epic says the shell owns the page frame, not page content. The footer drawn in the prototype belongs to the footer story and is not added here.
  - description: |
      Tests (written first, see `tests`): a vitest + Testing Library unit file for TopBar, and a Playwright spec that checks the real breakpoint behaviour in a browser, since jsdom does not evaluate media queries.
    files:
      - apps/web/tests/unit/TopBar.test.tsx
      - apps/web/e2e/top-bar.spec.ts
    rationale: |
      The unit tests cover order, menu toggle, active link and guest/signed-in sameness. Playwright covers the visible/hidden behaviour at phone and desktop widths (ACs 1-3).
tests:
  - |
    AC1 (order). Unit, apps/web/tests/unit/TopBar.test.tsx, `vi.mock("next/navigation", () => ({ usePathname: () => "/" }))` at the top. Write first, fails until TopBar exists:
    ```tsx
    render(<TopBar />);
    const brand = screen.getByRole("link", { name: "Shopping Website" });
    expect(brand).toHaveAttribute("href", "/");
    const links = within(screen.getByRole("navigation", { name: "Main", hidden: true })).getAllByRole("link", { hidden: true });
    expect(links.map((a) => a.textContent)).toEqual(["Home", "Shop", "Account", "Saved", "Bag"]);
    expect(links.map((a) => a.getAttribute("data-nav-key"))).toEqual(["home", "shop", "account", "wishlist", "cart"]);
    expect(brand.compareDocumentPosition(links[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    ```
    Playwright (apps/web/e2e/top-bar.spec.ts), desktop `test.use({ viewport: { width: 1024, height: 768 } })`: the five links are visible, the Menu button is not, and their x positions increase in order:
    ```ts
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
    const xs = [];
    for (const name of ["Home", "Shop", "Account", "Saved", "Bag"]) {
      const link = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name });
      await expect(link).toBeVisible();
      xs.push((await link.boundingBox())!.x);
    }
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    ```
  - |
    AC2 (collapsed below breakpoint). Unit: on first render the nav is hidden and one Menu button is exposed:
    ```tsx
    render(<TopBar />);
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument(); // hidden nav is excluded from the a11y tree
    expect(screen.getAllByRole("button")).toHaveLength(1);
    ```
    Playwright, `test.use({ viewport: { width: 375, height: 667 } })`:
    ```ts
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
    for (const name of ["Home", "Shop", "Account", "Saved", "Bag"]) {
      await expect(page.getByRole("link", { name, exact: true })).toBeHidden();
    }
    ```
  - |
    AC3 (menu opens). Unit:
    ```tsx
    render(<TopBar />);
    await userEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "true");
    for (const name of ["Home", "Shop", "Account", "Saved", "Bag"]) {
      expect(screen.getByRole("link", { name })).toBeVisible();
    }
    ```
    Also a unit test that clicking a link closes the menu again, and one that with `usePathname` mocked to "/shop" only the Shop link has `aria-current="page"` (Home does not). Playwright at 375px: click Menu, then assert the five links are visible in order.
  - |
    AC4 (guest and signed-in identical). The component has no auth input, so the test pins that. Render once with no session, and once with a `shopper-session` cookie or localStorage flag set up in Playwright `context.addCookies`. Both produce the same list:
    ```ts
    const names = await page.getByRole("navigation", { name: "Main" }).getByRole("link").allTextContents();
    expect(names).toEqual(["Home", "Shop", "Account", "Saved", "Bag"]);
    ```
    Unit: `expect(TopBar.length).toBe(0)` (no props) and render twice, asserting the two `container.innerHTML` strings are equal.
  - |
    Regression: apps/web/e2e/home.spec.ts still passes (`getByRole("heading", { name: "Shopping Website" })`), because the brand is a link, not a heading, and the page keeps one h1 from Hero. apps/web/tests/unit/Hero.test.tsx is unchanged.
assumptions_or_open_questions:
  - |
    Deferred question (how the bar learns signed-in state and current section). Answer: it does not need signed-in state, because AC4 and the prototype require the same six items for guest and signed-in shoppers; Account always links to the Account area and that area decides (sign-in vs orders). The current section comes from `usePathname()` in the client component. No auth store exists in apps/web or the API today (read apps/web/src: only layout, page, Hero), so nothing is invented.
  - |
    Account, Shop, Saved and Bag routes (`/shop`, `/account`, `/wishlist`, `/cart`) do not exist yet in apps/web/src/app, so those links 404 until their stories land. I chose these paths from the data-nav-key values in the guidelines. A human should confirm the intended paths (for example `/saved` instead of `/wishlist`, since visible copy says "Saved").
  - |
    The Bag item shows no item count (the prototype says the count is not part of this story).
  - |
    Browser/device support and the accessibility standard are still open project-wide (EPIC-003). The plan follows the prototype and guidelines: native `button` and `a` elements, `aria-expanded`, `aria-controls`, `aria-current="page"`, a labelled nav landmark, and the design system's focus-visible outline. No WCAG level is claimed. Launch environments and backup expectations (CHORE-011) do not affect this UI-only change.
  - |
    The 48rem breakpoint is a literal in the media query (as in the prototype and guidelines) because the tokens have no breakpoint token. Please confirm this is acceptable.
  - |
    Importing design-system/ from outside apps/web via a relative path should work with Next and Tailwind v4, but if the build rejects a path outside the app root, the fallback is to copy tokens.css and prototype-utils.css into apps/web/src/app/. Also, prototype-utils.css has global element rules (body, h1, a) that apply alongside Tailwind's preflight; the implementer should check Hero still looks right.
  - |
    The menu is not reachable without JavaScript below 48rem (the nav starts hidden, as in the prototype). Hero's text and the layout are server-rendered; this is accepted as in the prototype.
  - |
    The prototype's footer, the "Home page stand-in" cards and the guest/signed-in checklists are review scaffolding or other stories, not built here.
estimated_points: 3
package_dependencies: []
notes: |
  ### Data & rollout
  None — UI only: no schema, stored data, seed, setting or env var changes. Deploy order is irrelevant; rollback is reverting the commit.

  Design source: the approved prototype (SHOPPING-WEBSITE-STORY-012-design.html) and design-system/app-shell.html. Tokens come from design-system/tokens.css (e.g. `--color-primary`, `--space-2`). Today the app does not load them: apps/web/src/app/globals.css is just `@import "tailwindcss";` and apps/web/src/app/layout.tsx imports that file on line 2. That import is the single place tokens get loaded.

  Prototype vs ACs: no conflict. The prototype's `aria-current` on Home is a demo of the active link, not an AC. The prototype's "Meera Iyer"/Guest badges are review scaffolding only.

  Unit tests need `userEvent`: if `@testing-library/user-event` is not installed (it is not in apps/web/package.json), use `fireEvent.click` from `@testing-library/react` instead of adding a dependency.

  ```mermaid
  flowchart TD
    layout["src/app/layout.tsx — mounts shell"]
    page["src/app/page.tsx — drop nested main"]
    topbar["src/components/TopBar.tsx — new client component"]
    css["src/app/globals.css — import tokens + shell rules"]
    ds["design-system/tokens.css, prototype-utils.css"]
    hero["src/components/Hero.tsx"]
    layout --> topbar
    layout --> css
    css --> ds
    layout --> page
    page --> hero
    classDef touched fill:#f96,color:#000
    class layout,page,topbar,css touched
  ```
review_focus: |
  IN: TopBar (six items, fixed order, collapse below 48rem behind one Menu button), the shell CSS on tokens, and the layout wiring. OUT: footer, search, promo banner, Bag count, auth, and the Shop/Account/Saved/Bag pages. Riskiest areas are the cross-folder CSS import of design-system/ and the `hidden` attribute versus the 48rem `display:flex !important` override, which must be verified in a real browser (Playwright), not jsdom. The bar deliberately takes no signed-in input, which is how AC4 is met.
