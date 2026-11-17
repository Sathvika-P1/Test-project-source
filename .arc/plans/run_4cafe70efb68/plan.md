summary: |
  Let signed-in staff manage the sub-categories (the "Shop by category" cards) under the seven fixed top-level categories, and let shoppers see the result. The repo has no catalogue data yet (no categories or products tables, no repository layer; `pg` is a dependency but unused), so this story adds the minimum: a Postgres migration + seed for the 7 fixed top-level categories, sub-categories and a minimal products table whose `subcategory_id` is NOT NULL (each product in exactly one sub-category); a `CatalogStore` in the Shop API with admin routes (behind the existing single `requireAdmin` hook) to list, add, rename, remove sub-categories and move a product, plus a public read route for the category page; and in the Web App an `/admin/categories` page, a move-product page, and a server-rendered `/category/[slug]` shopper page, all built from the approved prototype and the existing design-system tokens/classes. Top-level categories are never writable: no API route and no UI control exists for them.
scope:
  - description: |
      Database schema, migration and seed (PostgreSQL). Tables:
      `top_categories(id, name UNIQUE, slug UNIQUE, position)` seeded with exactly Men, Women, Kids, Home, Beauty, GenZ, Studio;
      `subcategories(id, top_category_id FK, name, UNIQUE (top_category_id, lower(name)))`;
      `products(id, name, brand, subcategory_id NOT NULL FK ON DELETE RESTRICT)`.
      Also seeds the prototype's sub-categories (Shirts, T-shirts, Jeans, Jackets, Kurtas, ...) so a fresh install is not empty. Seed is idempotent (`INSERT ... ON CONFLICT DO NOTHING`).
      Add a tiny migration runner (`pg`, applies `*.sql` in order, tracked in a `schema_migrations` table) and a `migrate` script.
    files:
      - apps/api/migrations/001_catalog.sql
      - apps/api/src/db/migrate.ts
      - apps/api/src/db/pool.ts
      - apps/api/package.json
    rationale: |
      NOT NULL + RESTRICT in the database is the last line of defence for AC4 (a product can never lose its sub-category) and for "remove only when empty". The unique index enforces name uniqueness within a top-level category as in the prototype.
  - description: |
      Catalogue store behind an interface so routes are testable without a database:
      ```ts
      export interface CatalogStore {
        listTopCategories(): Promise<TopCategory[]>;                       // fixed 7, ordered
        listSubcategories(topSlug: string): Promise<SubcategoryWithCount[] | null>; // null = unknown top
        addSubcategory(topSlug: string, name: string): Promise<Result<Subcategory>>;
        renameSubcategory(id: number, name: string): Promise<Result<Subcategory>>;
        removeSubcategory(id: number): Promise<Result<void>>;              // refuses when it has products
        listProducts(topSlug?: string): Promise<ProductRow[]>;
        moveProduct(productId: number, subcategoryId: number): Promise<Result<ProductRow>>; // sub-category must belong to the product's top category
      }
      ```
      Provide `createMemoryCatalogStore(seed)` (tests) and `createPgCatalogStore(pool)` (production). Names are trimmed; empty, over-long (more than 60 chars) and case-insensitive duplicates within the same top-level category are refused with a typed error code (`empty`, `duplicate`, `has_products`, `not_found`, `wrong_top_category`).
      There is deliberately NO method that adds, renames or removes a top-level category.
    files:
      - apps/api/src/catalog/store.ts
      - apps/api/src/catalog/memoryStore.ts
      - apps/api/src/catalog/pgStore.ts
      - apps/api/src/catalog/types.ts
    rationale: Mirrors how `resolveSession` is injected into `buildApp`, so API tests need no database; the Pg implementation is the production path.
  - description: |
      Shop API routes. Admin routes live in a new plugin registered through the existing gated scope of `adminRoutes` (the one `requireAdmin` preHandler hook; no new role check):
      `GET /admin/categories` (7 tops + each top's sub-categories with product counts),
      `POST /admin/categories/:top/subcategories` body `{ name }` -> 201,
      `PATCH /admin/subcategories/:id` body `{ name }`,
      `DELETE /admin/subcategories/:id` (409 `has_products` when not empty),
      `GET /admin/products`,
      `PATCH /admin/products/:id` body `{ subcategoryId }` -> 400 `{ error: 'subcategory_required' }` when the value is missing, null or empty, with nothing written.
      Public (ungated) read route for the shopper page: `GET /categories` (7 tops) and `GET /categories/:top` (top + its sub-categories, as card data).
      Signature change: `AppOptions` gains `catalog?: CatalogStore` (defaults to an empty-sub-category memory store with the fixed 7 tops); `server.ts` builds the Pg store from `loadConfig().databaseUrl`.
      There is no POST/PATCH/DELETE route for top-level categories (unmatched -> 404).
    files:
      - apps/api/src/routes/adminCatalog.ts
      - apps/api/src/routes/categories.ts
      - apps/api/src/routes/admin.ts
      - apps/api/src/app.ts
      - apps/api/src/server.ts
    rationale: |
      Keeps all staff writes behind the one admin hook established by STORY-035 (resolver called once per request) and keeps shopper reads public. Reads for the shopper page come from the same tables staff edit, which is what makes AC5/AC6 true without any cache to invalidate.
  - description: |
      Web: server-side API client and Server Actions. `lib/catalogApi.ts` wraps fetch to the Shop API (base from the existing `API_BASE_URL`, same pattern and fail-closed handling as `lib/adminAccess.ts`), forwarding the request cookie for admin calls with `cache: "no-store"`. Server Actions in `app/admin/categories/actions.ts` (`addSubcategory`, `renameSubcategory`, `removeSubcategory`, `moveProduct`) call it and `revalidatePath` the admin pages and `/category/[slug]`. Authorization stays in the API plus the existing middleware/layout gate; actions add no role logic of their own.
    files:
      - apps/web/src/lib/catalogApi.ts
      - apps/web/src/app/admin/categories/actions.ts
    rationale: The browser never talks to the API cross-origin and the admin cookie is forwarded server-side, matching the existing `getAdminAccess` approach.
  - description: |
      Web: admin pages from the approved prototype (screens "Admin categories" and "Move product").
      `/admin/categories` (server component loads `GET /admin/categories`; client component `CategoryManager` holds the selected top): page-head h1 "Categories" with the muted intro; a `role="group" aria-label="Top-level categories"` row of 7 `.chip` buttons (`aria-pressed`) in a `.tops` flex-wrap row; a `.card` with `.sec-head` (h2 "{Top} sub-categories" + count), `.add-form` with `.field`/`.input` "New sub-category" (placeholder "For example, Sneakers", `.field-error` + `.is-invalid` for empty/duplicate, one `.btn-primary` "Add sub-category", label "Adding..." while pending), and `.sub-row` list (name + product count, `.btn-secondary` Rename, `.btn-ghost` Remove). Rename opens a `.modal` ("Rename sub-category", `.field` "New name", `.btn-primary` "Save name", `.btn-secondary` "Cancel"). Remove is `.btn-danger` inside a `.modal` role=alertdialog; refused with a toast when the sub-category has products. States: loading = `loading.tsx` with three `.skeleton.sk` rows in a `role="status"` `.card`; empty = `.empty-state` "No sub-categories under {Top} yet" / "Add the first one above."; error = `.alert.alert-danger` "Sub-categories didn't load" with a "Try again" `.btn-secondary` (Next `error.tsx` with `reset`). No control to add, rename or remove a top-level category is rendered anywhere (AC7/AC8).
      `/admin/products/move` ("Move product"): `.grid` of two `.card`s - a form (`.alert.alert-danger` "Not saved" region, `.select` Product, `.select` Sub-category with a "Choose a sub-category" empty option and hint "Currently in {sub}.", `.field-error` "Choose a sub-category. Every product needs one.", `.btn-primary` "Save sub-category") and a live "{Top} products by sub-category" list from `GET /admin/products`. Clearing the choice and saving shows the inline error and the alert, calls the API (which also refuses) or blocks client-side, and the product keeps its sub-category.
      `AdminTabs` (existing component) gains `Categories` (`/admin/categories`) and `Move product` (`/admin/products/move`) tabs; the prototype itself marks this addition as "reviewer to confirm". Reuse existing `AdminTabs`, `AccessGate`, and the admin layout gate; no new role check.
      Styling uses only design-system tokens already loaded via `apps/web/src/app/globals.css` lines 2-3 (`@import ../../../../design-system/tokens.css` and `prototype-utils.css`, which define `.chip`, `.card`, `.alert*`, `.modal`, `.empty-state`, `.skeleton`, `.badge-*`, `.field*`, `.input`, `.select`, `.btn*`, `.stack`, `.grid`). Layout classes only the prototype defines inline (`.tops`, `.sec-head`, `.add-form`, `.sub-row`, `.members`, `.shop-card`, `.ph`, `.backdrop-x`, `.sr-only`) are added to `apps/web/src/app/admin/admin.css` (and the `.shop-card`/`.ph`/`.tops` ones to a shared stylesheet imported by the shopper page) on the same tokens: `--space-1..6`, `--color-border`, `--color-bg-subtle`, `--color-fg-muted`, `--color-backdrop`, `--opacity-backdrop`, `--z-overlay`, `--size-control-md`, `--radius-md`, `--border-width`, `--font-size-lg`. No hex or raw px values. `.toast` already exists in `prototype-utils.css`; the page shows low-stakes success ("Added Sneakers under Men", "Renamed to Formal Shirts", "Saved. {product} is now in {sub}") with it.
    files:
      - apps/web/src/app/admin/categories/page.tsx
      - apps/web/src/app/admin/categories/loading.tsx
      - apps/web/src/app/admin/categories/error.tsx
      - apps/web/src/components/admin/CategoryManager.tsx
      - apps/web/src/app/admin/products/move/page.tsx
      - apps/web/src/components/admin/MoveProductForm.tsx
      - apps/web/src/components/admin/AdminTabs.tsx
      - apps/web/src/app/admin/admin.css
    rationale: Implements the approved "Admin categories" (default, empty, loading, error) and "Move product" (default, refused) screens, reusing the shared admin layout, tabs and gate from STORY-035.
  - description: |
      Web: shopper "Men category page" screen as a server-rendered route `/category/[slug]` (Next.js chosen for server-rendered catalogue pages): h1 = top-level name, muted "Shop by category", the same 7 `.chip` links (links, not buttons, since they navigate; `aria-current` on the active one), and a `.grid` of `.card.shop-card` cards each showing the `.ph` image placeholder (icon) and `<strong>` sub-category name. Empty state per prototype: `.empty-state` "No categories to shop yet" / "Check back soon, or browse everything in Shop." Unknown slug -> `notFound()`. Fetched with `cache: "no-store"` so a rename or new sub-category shows on the next load (AC5/AC6).
    files:
      - apps/web/src/app/category/[slug]/page.tsx
      - apps/web/src/components/CategoryCards.tsx
    rationale: The storefront view of the same data; the prototype's cards are not links to product listings yet (it shows a "products open in Shop" toast), so cards stay non-navigating until a Shop story exists.
tests:
  - |
    Write first, in `apps/api/src/routes/adminCatalog.test.ts` (vitest + `app.inject`, memory store, existing `admin`/`shopper` session fixtures). AC1:
    ```ts
    const res = await app.inject({ method: 'POST', url: '/admin/categories/men/subcategories', payload: { name: 'Sneakers' } });
    expect(res.statusCode).toBe(201);
    const list = (await app.inject({ method: 'GET', url: '/admin/categories' })).json();
    expect(list.find((t) => t.name === 'Men').subcategories.map((s) => s.name)).toContain('Sneakers');
    ```
    plus: empty name -> 400, duplicate (case-insensitive) in the same top -> 409, the same name under Women is allowed, and a shopper session / signed-out visitor gets 403 / 401 with nothing written.
  - |
    AC2 (same file): with "Shirts" under Men holding product 1, `PATCH /admin/subcategories/:id` with `{ name: 'Formal Shirts' }` returns 200; then
    ```ts
    const names = men.subcategories.map((s) => s.name);
    expect(names).toContain('Formal Shirts');
    expect(names).not.toContain('Shirts');
    ```
    and the product is still in that same sub-category (rename keeps its id). Duplicate or empty rename -> 409 / 400.
  - |
    AC3 (same file): product in Shirts, `PATCH /admin/products/:id` with `{ subcategoryId: formalShirtsId }` -> 200; then
    ```ts
    expect(inShirts.products.map((p) => p.id)).not.toContain(productId);
    expect(inFormal.products.map((p) => p.id)).toEqual([productId]);
    ```
    Moving to a sub-category under a different top-level category -> 400 `wrong_top_category`, product unchanged.
  - |
    AC4 (same file): for each of `{}`, `{ subcategoryId: null }`, `{ subcategoryId: '' }`:
    ```ts
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'subcategory_required' });
    expect((await store.listProducts()).find((p) => p.id === productId)!.subcategoryName).toBe('Shirts');
    ```
    Also in `apps/api/src/catalog/pgStore.test.ts` (runs only when `TEST_DATABASE_URL` is set, otherwise `describe.skip`): `UPDATE products SET subcategory_id = NULL` rejects with a NOT NULL violation, and deleting a sub-category that has products is rejected (RESTRICT), so the invariant holds beneath the API.
  - |
    AC5 (`apps/api/src/routes/categories.test.ts`, no session needed): after an admin adds "Sneakers" under Men,
    ```ts
    const res = await app.inject({ method: 'GET', url: '/categories/men' });
    expect(res.json().subcategories.map((s) => s.name)).toContain('Sneakers');
    ```
    Web side, `apps/web/src/components/CategoryCards.test.tsx` (vitest + Testing Library): `render(<CategoryCards top="Men" subcategories={[{id:1,name:'Sneakers'}]} />)` then `expect(screen.getByText('Sneakers')).toBeInTheDocument()`; empty list renders "No categories to shop yet". Plus `apps/web/src/app/category/[slug]/page.test.tsx`: unknown slug calls `notFound`.
  - |
    AC6 (`categories.test.ts`): after the rename in AC2,
    ```ts
    const names = (await app.inject({ method: 'GET', url: '/categories/men' })).json().subcategories.map((s) => s.name);
    expect(names).toContain('Formal Shirts');
    expect(names).not.toContain('Shirts');
    ```
    Web `CategoryCards.test.tsx`: `expect(screen.queryByText('Shirts')).not.toBeInTheDocument()` when given only `Formal Shirts`. Playwright e2e `apps/web/e2e/categories.spec.ts` (against a running API with the memory store and an admin session stub) covers add -> open `/category/men` -> card visible, and rename -> card renamed.
  - |
    AC7 (`adminCatalog.test.ts`):
    ```ts
    const tops = (await app.inject({ method: 'GET', url: '/admin/categories' })).json().map((t) => t.name);
    expect(tops).toEqual(['Men', 'Women', 'Kids', 'Home', 'Beauty', 'GenZ', 'Studio']);
    ```
    Web `apps/web/src/components/admin/CategoryManager.test.tsx`: the chip group `getByRole('group', { name: 'Top-level categories' })` contains exactly those 7 buttons in that order. Also `apps/api/src/db/seed.test.ts` (TEST_DATABASE_URL-gated): the seeded `top_categories` names equal the same list and re-running the seed leaves 7 rows.
  - |
    AC8 (API): `POST /admin/categories`, `PATCH /admin/categories/men`, `DELETE /admin/categories/men` all return 404 (no such route). Web `CategoryManager.test.tsx`:
    ```ts
    expect(screen.queryByRole('button', { name: /add (top-level )?category/i })).toBeNull();
    const group = screen.getByRole('group', { name: 'Top-level categories' });
    expect(within(group).queryByRole('button', { name: /rename|remove|delete/i })).toBeNull();
    ```
    Only "Add sub-category", and per-row "Rename {name}" / "Remove {name}" controls exist, all scoped to sub-categories.
  - |
    Supporting UI tests (`CategoryManager.test.tsx`, `MoveProductForm.test.tsx`): add form shows `.field-error` "Enter a name, like Sneakers." with `aria-invalid`/`is-invalid` for an empty submit; Remove on a sub-category with products shows the "Can't remove ..." message and no modal; clearing the Move product select and saving shows "Choose a sub-category. Every product needs one." plus the "Not saved" alert and the server action is not called with an empty id; empty and error states render the prototype copy.
assumptions_or_open_questions:
  - |
    No catalogue data exists in the repo (searched `apps/api/src` and `apps/web/src`: no categories/products code, no migrations, `pg` unused). Products are a separate story ("Products opens in its own story" in the prototype), so this plan creates only a MINIMAL `products` table (id, name, brand, subcategory_id) needed for AC3/AC4 and seeds the prototype's sample products. When the Products story lands it must extend this table rather than recreate it. Reviewer: confirm, or tell me which story owns the products schema so the two do not collide.
  - |
    Sub-category deletion ("Remove") is in the approved prototype but not in the acceptance criteria. Planned as in the prototype: only when the sub-category has no products (409 otherwise), behind a confirm modal. Drop the delete route, the Remove button and its modal if you want strictly the 8 ACs.
  - |
    Name rules are not stated in the item: assumed trimmed, 1-60 characters, unique case-insensitively within one top-level category (same name under another top-level is fine), as the prototype enforces. A product can only move to a sub-category under its own top-level category (prototype behaviour); AC3 does not say otherwise.
  - |
    Renaming keeps the sub-category id so products stay attached (the rename modal says "Products stay in this sub-category"). The shopper page reads live with no caching, so AC5/AC6 hold on the next page load; no real-time push is planned.
  - |
    Admin sign-in is outside this story: `server.ts` currently calls `buildApp()` with the deny-all resolver, so against a real server the admin routes return 401 until the shopper sign-in story supplies a `SessionResolver`. E2E and API tests inject a resolver; the plan does not add sign-in.
  - |
    The prototype adds Categories and Move product tabs to the admin bar and flags it "reviewer to confirm". Route `/admin/products/move` for Move product is my choice (the prototype has no URLs). The shopper route `/category/[slug]` (slug lowercased, e.g. `men`) is also my choice; the repo has no category route yet.
  - |
    Deferred project-wide questions (audit-record retention, launch environments, backup/recovery) are not answered by this item. This plan writes no change history; nothing here stores who changed what. If audit records are required for category edits that is a separate piece of work that depends on the retention answer.
  - |
    API test runs without a database (memory store). The Pg store is verified by tests gated on `TEST_DATABASE_URL`; the project test command does not provide one, so those are skipped in the default run. Open: should CI provision Postgres for them?
estimated_points: 8
package_dependencies: []
notes: |
  ### Data & rollout

  - **Existing data**: None exist for these tables, so `001_catalog.sql` only creates new tables (no existing rows altered). `products.subcategory_id` is NOT NULL, which is safe because the table is new and the seed inserts every product with a sub-category. When the Products story adds rows they must supply one.
  - **Backfill / seed**: The migration seeds the 7 fixed top-level categories, the prototype's sub-categories and sample products using `INSERT ... ON CONFLICT DO NOTHING`, so re-running is idempotent and never overwrites staff edits (renamed rows keep their ids and are not re-created under the old name only if the conflict key is the id/slug, so the seed keys top categories by `slug` and inserts sub-categories only when their top category has none). The sample products are demo data; reviewer to decide whether production should seed them (see open questions).
  - **Settings**: reuses `DATABASE_URL` (default `postgresql://postgres:postgres@localhost:5432/shop`, already in `apps/api/src/config.ts`) and `API_BASE_URL` for the web app (already read by `apps/web/src/lib/adminAccess.ts`, documented in `apps/web/.env.example`). No new env vars. New API script: `pnpm run migrate` (`tsx src/db/migrate.ts`).
  - **Provisioning**: a reachable PostgreSQL (ADR-0003) and the migration run before the API starts.
  - **Order and rollback**: deploy order is migrate, then API, then web. Rollback: the web and API changes can be reverted independently; the tables are additive and can be left in place. A `001_catalog.down.sql` (drop products, subcategories, top_categories) is provided for a full rollback in non-production.

  ### Notes

  - Follows existing patterns: injected dependencies in `buildApp` (like `resolveSession`), admin routes registered inside `adminRoutes`'s gated scope so the single `requireAdmin` hook covers them (STORY-035 AC4 test style), web gate via `middleware.ts` + `admin/layout.tsx`, tokens via `globals.css`.
  - Stack is unchanged: Fastify + pg + vitest/supertest on the API; Next.js + Tailwind (tokens/classes from `design-system/`) + vitest/Testing Library + Playwright on the web. No new packages.
  - Prototype vs ACs: no conflict found. The prototype shows more than the ACs (remove, inline duplicate-name errors, loading and error states); these are kept because they are in the approved design.
  - Domain nouns used: top-level category, sub-category, "Shop by category" card, product, administration area.

  ```mermaid
  flowchart TD
    A[app.ts buildApp: new catalog option] --> B[routes/admin.ts adminRoutes gated by requireAdmin]
    B --> C[routes/adminCatalog.ts admin catalogue routes]
    A --> D[routes/categories.ts public read routes]
    C --> S[catalog/store.ts CatalogStore]
    D --> S
    S --> P[catalog/pgStore.ts]
    P --> M[migrations/001_catalog.sql]
    W1[admin/categories page + CategoryManager] --> ACT[admin/categories/actions.ts]
    W2[admin/products/move page] --> ACT
    ACT --> CA[lib/catalogApi.ts]
    W3[category/slug page] --> CA
    CA --> C
    CA --> D
    L[admin/layout.tsx role gate] --> W1
    L --> W2
    T[AdminTabs.tsx new tabs] --> L
    classDef touched fill:#f96,color:#000
    class A,B,C,D,S,P,M,W1,W2,W3,ACT,CA,T touched
  ```
review_focus: |
  IN: sub-category add/rename/remove, moving a product, refusing a cleared sub-category, the shopper category page, and the minimal schema/seed they need. OUT: top-level category writes (must be impossible at API and UI level), full product management, sign-in, audit history. Riskiest areas are the invariant "each product in exactly one sub-category" (enforced in the API and by NOT NULL/RESTRICT in the database) and keeping every staff write behind the single existing `requireAdmin` hook. Deliberate: the minimal `products` table (no existing products schema in the repo), Remove included because the approved prototype shows it, and Pg-store tests gated on `TEST_DATABASE_URL`.
