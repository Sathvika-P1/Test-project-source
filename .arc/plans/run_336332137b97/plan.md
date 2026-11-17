summary: |
  Let signed-in staff (the API's existing `admin` role, gated by `requireAdmin`) add, edit (including price) and remove products, and show those changes on the storefront. Nothing in the repo stores or serves a catalogue yet: the API has only `/health` and `/admin/access`, there is no database access code or migration, and the web app has no shop pages. So this story plans the whole slice end to end. On the Shop API (comp_shop_api) it adds a Postgres catalogue schema (`sub_categories`, `products`), a `ProductStore` with an in-memory and a `pg` implementation, staff-only product routes behind the existing admin hook, and public read routes for the storefront. On the Web App (comp_web_app) it replaces the "coming soon" `/admin/products` page with the approved list / add-edit form / remove-confirm screens and adds a minimal server-rendered `/shop` page so a saved, re-priced, edited or removed product is visible to shoppers. Work is test-first, one failing test per acceptance criterion.

scope:
  - description: |
      API database foundation: a `pg` Pool factory, a tiny migration runner (no new dependency) and the first migration. Tables: `sub_categories(id uuid pk, top_level text, name text, unique(top_level, name))` and `products(id uuid pk, name text not null, brand text not null, description text not null, sub_category_id uuid NOT NULL references sub_categories(id), price_minor integer not null check (price_minor > 0), sizes text[] not null check (cardinality(sizes) >= 1), images text[] not null check (cardinality(images) between 1 and 5), created_at, updated_at)`. The NOT NULL foreign key is the database-level backstop for AC2. The migration idempotently seeds the prototype's sub-categories (Men: Shirts, Kurtas, Sneakers; Women: Kurtas, Sarees, Tops; Home: Tableware, Cushions) with `INSERT ... ON CONFLICT DO NOTHING`. Add a `migrate` script to `apps/api/package.json` (`tsx src/db/migrate.ts`) and call the pool factory from `server.ts` using `config.databaseUrl`.
    files:
      - apps/api/migrations/001_catalogue.sql
      - apps/api/migrations/001_catalogue.down.sql
      - apps/api/src/db/pool.ts
      - apps/api/src/db/migrate.ts
      - apps/api/src/server.ts
      - apps/api/package.json
    rationale: |
      Products need somewhere durable to live; ADR-0003 fixes PostgreSQL and `pg` is already a dependency of comp_shop_api, so no package is added. Sub-categories are seeded only so the form has options. Their real management belongs to the categories story (the design notes it is owned by STORY-037).
  - description: |
      Product domain and store. `ProductStore` interface plus validation, written test-first.

      ```ts
      export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'One size'] as const;
      export interface ProductInput { name: string; brand: string; description: string; subCategoryId: string; price: number; sizes: Size[]; images: string[] }
      export interface Product extends ProductInput { id: string; subCategory: { id: string; topLevel: string; name: string } }
      export interface ProductStore {
        listSubCategories(): Promise<SubCategory[]>;
        list(filter?: { subCategoryId?: string }): Promise<Product[]>;
        get(id: string): Promise<Product | null>;
        create(input: ProductInput): Promise<Product>;          // throws UnknownSubCategoryError
        update(id: string, patch: Partial<ProductInput>): Promise<Product | null>;
        remove(id: string): Promise<boolean>;
      }
      ```

      `pgProductStore(pool)` stores price as integer paise (`price_minor`) and exposes whole rupees as a number with at most 2 decimals. `memoryProductStore()` is used by unit tests and mirrors the same rules.
    files:
      - apps/api/src/products/types.ts
      - apps/api/src/products/memoryStore.ts
      - apps/api/src/products/pgStore.ts
    rationale: |
      A store interface keeps routes testable with `app.inject` and no database, matching how `admin.test.ts` already injects a fake `resolveSession`. The `pg` store is verified separately against a real Postgres in the e2e suite.
  - description: |
      Staff product routes registered INSIDE the existing gated scope, so the one `requireAdmin` preHandler protects them. Wire it through `adminRoutes` (new option `productStore`) and `buildApp` (new `AppOptions.productStore?: ProductStore`, defaulting to `memoryProductStore()` for tests only; `server.ts` always passes the `pg` store).

      - `GET /admin/products`, `GET /admin/products/:id`, `GET /admin/sub-categories`
      - `POST /admin/products` returns 201 with the product
      - `PATCH /admin/products/:id` changes any subset of name, brand, description, images, sub-category, sizes and price (the price change in AC3 is the same call with `{ price }`)
      - `DELETE /admin/products/:id` returns 204

      Bodies use Fastify JSON-schema validation. `additionalProperties` is false, so stock and discount fields are rejected as out of scope. Strings are trimmed and non-empty. `subCategoryId` is required on create and may not be null on patch. `price` is greater than 0 with at most 2 decimals. `sizes` has 1 or more entries from `SIZES`. `images` has 1 to 5 non-empty string references. Responses are 400 `{error:'invalid', fields:{...}}`, 404 for an unknown id, and an unknown `subCategoryId` also gives 400. Non-staff gets 403 and signed-out gets 401 from the existing hook, before any handler runs.
    files:
      - apps/api/src/routes/adminProducts.ts
      - apps/api/src/routes/admin.ts
      - apps/api/src/app.ts
    rationale: |
      Reuses the single-hook gate that STORY-035 established (`adminRoutes` plus `requireAdmin`) rather than adding per-route role checks, so AC6 holds for every mutation by construction.
  - description: |
      Public storefront read routes, outside the admin scope: `GET /sub-categories` and `GET /products?subCategoryId=<uuid>`, returning the same product shape without any admin-only fields. Registered in `buildApp` next to `healthRoutes`.
    files:
      - apps/api/src/routes/catalogue.ts
      - apps/api/src/app.ts
    rationale: |
      AC1, 3, 4 and 5 are all stated as "the storefront shows ...", so the storefront needs a real read path, not the design's inline sample data.
  - description: |
      Web data access, server-side only, following the `getAdminAccess` pattern (forward the request cookie, `cache: 'no-store'`, fail closed). `apps/web/src/lib/catalogueApi.ts` holds `listProducts`, `getProduct`, `listSubCategories` and `listPublicProducts`. A server-actions file holds `createProduct`, `updateProduct` and `deleteProduct`. Each reads `cookies()`, calls the Shop API with that cookie, maps 401/403 to `{ ok:false, reason:'not-staff' }` and 400 to field errors, then calls `revalidatePath('/shop')` and `revalidatePath('/admin/products')` on success.

      ```ts
      export type SaveResult =
        | { ok: true; product: Product }
        | { ok: false; reason: 'not-staff' | 'invalid' | 'error'; fields?: Record<string, string> };
      ```
    files:
      - apps/web/src/lib/catalogueApi.ts
      - apps/web/src/app/admin/products/actions.ts
    rationale: |
      The browser never calls the API directly. The session cookie is forwarded server-side exactly as `layout.tsx` and `middleware.ts` already do, and the API stays the only enforcement point for the staff role.
  - description: |
      Admin products UI from the approved prototype ("Admin products" and "Product form" screens). All sit under the existing `/admin` layout, which already renders `AdminTabs` (the prototype's admin bar) and `AccessGate`; neither is rebuilt.

      - `/admin/products/page.tsx`: replaces the placeholder. A server component lists products in a `.card` of `ProductRow`s (thumb, name, brand, "Sub-category", "Sizes: ...", price via `Intl.NumberFormat(undefined,{style:'currency',currency:'INR'})`, Edit `.btn-secondary`, Remove `.btn-ghost`) and an "Add product" `.btn-primary` in `.page-head`.
      - Empty state: `.empty-state` "No products yet" with a second "Add product" button.
      - `loading.tsx`: three `.skeleton.sk` rows with "Loading products…" in `role="status"`.
      - `error.tsx`: `.alert.alert-danger role="alert"` "Products didn't load" with a Retry `.btn-secondary` calling `reset()`.
      - `new/page.tsx` and `[id]/edit/page.tsx` render the client `ProductForm`. It has fields Name, Brand, Description (`.textarea`), Sub-category (`.select` with `<optgroup>` per top-level and a "Choose a sub-category" empty option), Price (₹), Sizes (`SizeToggleGroup`, `.opts`), Images (`ImageSlotPicker`, up to 5, first is main) and "Save product" `.btn-primary` / Cancel `.btn-secondary` in `.formbar`.
      - Client validation mirrors the prototype's messages ("Enter a product name.", "Enter a brand.", "Add a short description.", "Choose a sub-category. A product can't be saved without one.", "Enter a price like 1899.", "Pick at least one size.", "Add at least one image."), using `.field-error` and `.is-invalid`, and keeps all typed values. It focuses the first invalid control. While pending, Save is disabled and reads "Saving…". Success shows `.alert.alert-success` "Saved" with a "View on storefront" link to `/shop`. A `not-staff` result shows the `.alert.alert-danger` "Not saved" text from the prototype.
      - `RemoveProductModal` (client): `.backdrop` + `.modal` with `role="dialog" aria-modal`, "Remove this product?", naming the product and "can't be undone", "Keep product" `.btn-secondary` and "Remove product" `.btn-danger`. It closes on Esc and returns focus to the trigger. Success shows a `.toast` "Removed ..." (Undo is dropped: removal is permanent, see open questions).

      Tokens used (loaded by `apps/web/src/app/globals.css` lines 2-3, which import `design-system/tokens.css` and `design-system/prototype-utils.css`; nothing new to load): `--space-1..6`, `--radius-md`, `--border-width`, `--color-border`, `--color-border-strong`, `--color-bg-subtle`, `--color-fg`, `--color-bg`, `--color-fg-muted`, `--color-primary`, `--color-danger`, `--size-control-md`, `--size-control-lg`, `--size-toast`, `--font-size-xs`, `--font-weight-medium`, `--font-weight-bold`.

      New classes the prototype defines only in its own inline style (`.prow`, `.thumb`, `.form`, `.opts`, `.imgs`, `.imgslot`, `.formbar`, `.modal-actions`) are added to `apps/web/src/app/admin/admin.css` on those tokens with the prototype's rules (the `.prow` grid collapses actions under the row below 48rem). `.page`, `.page-head`, `.muted`, `.admin-bar` and `.sk` already exist in `admin.css`. `.page-head` needs `display:flex; justify-content:space-between` to place the Add button, as the prototype has. Classes `btn-*`, `card`, `field*`, `input`, `textarea`, `select`, `alert*`, `modal`, `backdrop`, `toast`, `skeleton`, `empty-state`, `chip` and `badge-success` are defined in `design-system/prototype-utils.css` (verified by grep); no raw hex or px values are planned.
    files:
      - apps/web/src/app/admin/products/page.tsx
      - apps/web/src/app/admin/products/loading.tsx
      - apps/web/src/app/admin/products/error.tsx
      - apps/web/src/app/admin/products/new/page.tsx
      - apps/web/src/app/admin/products/[id]/edit/page.tsx
      - apps/web/src/components/admin/ProductRow.tsx
      - apps/web/src/components/admin/ProductForm.tsx
      - apps/web/src/components/admin/SizeToggleGroup.tsx
      - apps/web/src/components/admin/ImageSlotPicker.tsx
      - apps/web/src/components/admin/RemoveProductModal.tsx
      - apps/web/src/app/admin/admin.css
    rationale: |
      Builds the approved design. The prototype names these as its NEW components (Product row card, Image slot picker, Size toggle group); `AdminTabs` and `AccessGate` are reused unchanged.
  - description: |
      Minimal storefront: `/shop` is a server-rendered, `force-dynamic` page. It has a `role="group" aria-label="Sub-category"` row of `.chip` links (`aria-pressed` on the selected one, chosen by `?sub=<id>`) and a grid of product `.card`s: image area, name, "brand, sizes S, M", price in INR. An empty sub-category shows "No products in this sub-category." This is the prototype's "Storefront" stand-in screen made real, using `.sfgrid`/`.sfimg` in a new `shop.css` on the tokens `--size-grid-min`, `--space-3`, `--radius-md`, `--color-bg-subtle` and `--color-fg-muted`. The `Shop` top-bar link is out of scope: the app has no top-bar navigation yet.
    files:
      - apps/web/src/app/shop/page.tsx
      - apps/web/src/app/shop/shop.css
      - apps/web/src/components/shop/ProductCard.tsx
    rationale: |
      Without a shopper-facing page, AC1/3/4/5 cannot be observed. It is kept deliberately small so the full browse/search experience stays with its own story.
  - description: |
      Documentation of the migrate step in `apps/web/.env.example` is not needed (no new web setting). `API_BASE_URL` and `DATABASE_URL` already exist. Add a short "Run migrations" note to the API's README if one exists, otherwise skip.
    files: []
    rationale: |
      Keeps rollout steps discoverable without adding files for their own sake.

tests:
  - |
    AC1 (API, write first) in `apps/api/src/routes/adminProducts.test.ts`: a staff member's POST is stored and then listed publicly in that sub-category.

    ```ts
    const app = buildApp({ resolveSession: async () => admin, productStore: memoryProductStore() });
    const created = await app.inject({ method: 'POST', url: '/admin/products', payload: validProduct });
    expect(created.statusCode).toBe(201);
    const listed = await app.inject({ method: 'GET', url: `/products?subCategoryId=${validProduct.subCategoryId}` });
    expect(listed.json().map((p: any) => p.name)).toContain(validProduct.name);
    ```
  - |
    AC1 (web unit) in `apps/web/tests/unit/ProductForm.test.tsx`: a fully filled form calls the `createProduct` action with the typed values.

    ```ts
    await user.click(screen.getByRole('button', { name: 'Save product' }));
    expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({ name: 'Linen shirt', price: 1599, sizes: ['M'], subCategoryId: 'sub-1' }));
    ```
  - |
    AC2 (API) in `adminProducts.test.ts`: missing or empty `subCategoryId` is refused and nothing is stored. An unknown id is also refused.

    ```ts
    const { subCategoryId, ...noSub } = validProduct;
    const res = await app.inject({ method: 'POST', url: '/admin/products', payload: noSub });
    expect(res.statusCode).toBe(400);
    expect((await store.list()).length).toBe(0);
    ```
  - |
    AC2 (web unit) in `ProductForm.test.tsx`: submitting with no sub-category shows the inline error, keeps typed values, and never calls the action.

    ```ts
    expect(screen.getByText("Choose a sub-category. A product can't be saved without one.")).toBeVisible();
    expect(createProduct).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Name')).toHaveValue('Linen shirt');
    ```
  - |
    AC3 (API) in `adminProducts.test.ts`: PATCH with only a price changes the price on the public list and leaves other fields as they were.

    ```ts
    await app.inject({ method: 'PATCH', url: `/admin/products/${id}`, payload: { price: 1799 } });
    const [p] = (await app.inject({ method: 'GET', url: `/products?subCategoryId=${sub}` })).json();
    expect(p.price).toBe(1799);
    expect(p.name).toBe(validProduct.name);
    ```
  - |
    AC4 (API) in `adminProducts.test.ts`, parametrised with `it.each` over `name`, `brand`, `description`, `images`, `subCategoryId`, `sizes`: change that one field and assert the public product shows the new value. The sub-category case also asserts the product moves out of the old sub-category listing.

    ```ts
    it.each(Object.entries(changes))('AC4: changing %s is shown on the storefront', async (field, value) => {
      await app.inject({ method: 'PATCH', url: `/admin/products/${id}`, payload: { [field]: value } });
      const p = (await app.inject({ method: 'GET', url: `/products?subCategoryId=${target}` })).json().find((x: any) => x.id === id);
      expect(p[field]).toEqual(value);
    });
    ```
  - |
    AC5 (API) in `adminProducts.test.ts`: DELETE then the public list no longer holds the product. A second DELETE returns 404.

    ```ts
    expect((await app.inject({ method: 'DELETE', url: `/admin/products/${id}` })).statusCode).toBe(204);
    const ids = (await app.inject({ method: 'GET', url: `/products?subCategoryId=${sub}` })).json().map((p: any) => p.id);
    expect(ids).not.toContain(id);
    ```
  - |
    AC5 (web unit) in `apps/web/tests/unit/RemoveProductModal.test.tsx`: the modal names the product, "Keep product" closes without calling `deleteProduct`, and "Remove product" calls it once with that product's id.

    ```ts
    await user.click(screen.getByRole('button', { name: 'Remove product' }));
    expect(deleteProduct).toHaveBeenCalledExactlyOnceWith('p1');
    ```
  - |
    AC6 (API) in `adminProducts.test.ts`: a signed-in shopper is forbidden on every one of create, edit, remove and price change, and the store is unchanged. Signed-out gets 401.

    ```ts
    it.each([
      ['POST', '/admin/products', validProduct],
      ['PATCH', `/admin/products/${id}`, { name: 'Hacked' }],
      ['PATCH', `/admin/products/${id}`, { price: 1 }],
      ['DELETE', `/admin/products/${id}`, undefined],
    ])('AC6: shopper cannot %s %s', async (method, url, payload) => {
      const res = await shopperApp.inject({ method, url, payload });
      expect(res.statusCode).toBe(403);
      expect(await store.get(id)).toEqual(before);
    });
    ```
  - |
    AC6 (web unit) in `apps/web/tests/unit/productActions.test.ts`: when the API answers 403, the actions return the not-staff result and never revalidate.

    ```ts
    fetchMock.mockResolvedValue(new Response('{"error":"forbidden"}', { status: 403 }));
    expect(await createProduct(validInput)).toEqual({ ok: false, reason: 'not-staff' });
    expect(revalidatePath).not.toHaveBeenCalled();
    ```
  - |
    Storefront page (web unit, `apps/web/tests/unit/ShopPage.test.tsx`): the product list is rendered from the API, and the empty case reads "No products in this sub-category."
  - |
    Admin list states (web unit, `apps/web/tests/unit/AdminProductsPage.test.tsx`): the list shows name, brand and price. The empty list shows "No products yet". `error.tsx` shows "Products didn't load" and calls `reset` on Retry.
  - |
    Store parity (API e2e, supertest + real Postgres, `apps/api/test/e2e/products.e2e.ts`): the same create / patch price / patch field / delete / reject-no-sub-category flows against `pgProductStore`. It also asserts that a `products` insert with a null `sub_category_id` fails at the database.
  - |
    Migration (API e2e, `apps/api/test/e2e/migrate.e2e.ts`): running the migrations twice leaves the seed with exactly one row per (top_level, name), and a row inserted between runs is still readable.
  - |
    Browser flow (Playwright, `apps/web/e2e/products.spec.ts`, needs the API and a database): staff add a product, see it on `/shop`, change its price, see the new price, remove it, and see it gone. It is skipped with a clear reason when no staff session can be established (see open questions).

assumptions_or_open_questions:
  - |
    Staff are the API's existing `admin` role, as the item's "staff" and STORY-035's single-role gate imply. There is no separate staff role.
  - |
    There is currently no way to sign in (`buildApp` defaults to `denyAllResolver` and `server.ts` passes no resolver). This plan does not build sign-in or sessions. The routes are fully gated and tested with injected sessions, but staff cannot use the feature in a real deployment until the shopper sign-in story supplies a `SessionResolver`. Please confirm that is delivered separately.
  - |
    Sub-categories and the top-level list are owned by STORY-037, which is not in the repo. This plan creates a minimal `sub_categories` table seeded with the prototype's list so a product can reference one. If STORY-037 defines its own schema, one of the two stories must adapt, so please confirm which lands first. The schema here uses uuid ids and a (top_level, name) unique key.
  - |
    Images: the repo has no file storage or upload service, and the prototype only simulates images with placeholder file names. The plan stores 1 to 5 image references (https URL or site-relative path strings) and `ImageSlotPicker` takes a URL per slot. Real upload and hosting (bucket, size and type limits) is a decision the reviewer must make. It may be a separate story.
  - |
    Price is in INR (the prototype's assumption), stored as integer paise and shown with `Intl.NumberFormat`. Confirm that INR is the only currency.
  - |
    Sizes come from the fixed set XS, S, M, L, XL, One size (prototype). At least one size is required, which is stricter than the item text (which only says "sizes"). The design's validation message requires it.
  - |
    Remove is a permanent hard delete, as the prototype's modal says "can't be undone". The prototype's toast Undo is not built, since a deleted row cannot be restored. If an Undo or soft-delete is wanted, say so. This also affects the deferred question on how long change records are kept.
  - |
    Deferred question "how long are records of who changed what, and when, kept": this story keeps no change history (only `created_at` and `updated_at`), and no AC asks for one. The retention period is left open for the audit work and not decided here.
  - |
    Deferred question on launch environments and backup/recovery: not decided here. The migration runner and `DATABASE_URL` work for any Postgres, and per ADR-0005 the hosting is open. Backups are an operations item for a later chore.
  - |
    The `/shop` page is a minimal stand-in so shoppers can see the results. It has no search, sorting, pagination, product detail page or top-bar `Shop` link, which belong to catalogue-browsing stories. If a shop page lands elsewhere first, replace this one and keep the API read routes.
  - |
    Stock counts, discount ranges and offer codes are out of scope per the item. The write schema has `additionalProperties:false`, so these fields are refused rather than silently ignored.
  - |
    No concurrent-edit protection (last write wins). A single small team and up to 1,000 daily users (ADR-0004) make that acceptable. Say if you want an `updated_at` precondition.

estimated_points: 8

package_dependencies: []

notes: |
  ### Data & rollout

  - **Existing data**: no catalogue tables exist today, so `001_catalogue.sql` only creates new tables and touches no existing row. `products.sub_category_id` is NOT NULL, but the table starts empty. The constraint is the database backstop for AC2.
  - **Backfill / seed**: no backfill. The migration seeds `sub_categories` with `INSERT ... ON CONFLICT (top_level, name) DO NOTHING`, so it is idempotent and safe to re-run. The runner records applied files in a `schema_migrations` table, and the e2e migration test runs it twice.
  - **Settings**: no new setting. `DATABASE_URL` (default in `apps/api/src/config.ts`) is now actually used by the API, and `API_BASE_URL` (read in `apps/web/src/lib/adminAccess.ts`) is reused by the web data layer. Neither has a safe default in production, so both must be set at deploy.
  - **Provisioning**: a reachable PostgreSQL database matching `DATABASE_URL` must exist before the API starts. Nothing else (no bucket or queue). Staff access additionally needs a working sign-in that yields an `admin` session (see open questions).
  - **Order and rollback**: deploy order is (1) run `pnpm run migrate` in `apps/api`, (2) deploy the API, (3) deploy the web app. The routes and pages are additive, so older web code ignores them. Rollback is to redeploy the previous builds and optionally run `001_catalogue.down.sql` (drops `products`, then `sub_categories`). Leaving the tables in place is also safe, since nothing else reads them.

  ### Design and code findings

  - The approved prototype has three screens: Admin products (states default, loading, empty, error, not-staff, plus the remove modal), Product form (states not-staff and saved, with inline errors) and a Storefront stand-in. Its admin bar is the existing `AdminTabs`. The `/admin` layout already does the role check and renders `AccessGate`. `middleware.ts` rewrites non-admins to `/admin/denied`, so a non-staff user never reaches these pages. The "not-staff" alerts therefore cover the case where the API still refuses a save, for example a session that expired or lost the role.
  - Tokens and component classes are loaded by `apps/web/src/app/globals.css` (lines 2-3: `design-system/tokens.css` and `design-system/prototype-utils.css`). `admin.css` is imported by `admin/layout.tsx`. `/shop` imports its own `shop.css`.
  - Prototype conflict to note: the prototype's Storefront chips list only sub-categories that have products. The API's `GET /sub-categories` returns all sub-categories, so the `/shop` page shows every chip and an empty sub-category shows the empty message. This keeps a new product's sub-category reachable (AC1).
  - The prototype's page-level "Overview" and "Products" admin-bar buttons are the real `AdminTabs` links. The prototype's toast for Overview is not reproduced.

  ```mermaid
  flowchart TD
    subgraph Web[comp_web_app]
      MW[middleware.ts]:::ctx --> LAY[admin/layout.tsx]:::ctx
      LAY --> TABS[AdminTabs]:::ctx
      LAY --> PROD[admin/products pages]:::touched
      PROD --> FORM[ProductForm + RemoveProductModal]:::touched
      FORM --> ACT[products/actions.ts]:::touched
      PROD --> CAPI[lib/catalogueApi.ts]:::touched
      SHOP[shop/page.tsx]:::touched --> CAPI
      ACT --> CAPI
    end
    subgraph API[comp_shop_api]
      APP[app.ts]:::touched --> ADM[routes/admin.ts]:::touched
      ADM --> RA[auth/requireAdmin.ts]:::ctx
      ADM --> AP[routes/adminProducts.ts]:::touched
      APP --> CAT[routes/catalogue.ts]:::touched
      AP --> STORE[products ProductStore]:::touched
      CAT --> STORE
      STORE --> PG[(PostgreSQL: products, sub_categories)]:::touched
      SRV[server.ts]:::touched --> APP
    end
    CAPI -->|fetch with forwarded cookie| APP
    classDef touched fill:#f96,color:#000
    classDef ctx fill:#e7e5e4,color:#000
  ```

  - `apps/api/src/app.ts`, `routes/admin.ts` and `server.ts` are touched to inject the store. `adminProducts.ts` is new and sits inside the gated scope. `catalogue.ts` is new and public. The web pages call the API only on the server.

review_focus: |
  IN scope: staff create / edit (including price) / remove on the Shop API and the approved admin screens, a minimal `/shop` page and public read routes so the storefront shows the results, and a minimal catalogue schema. OUT of scope: sign-in and sessions, sub-category management (STORY-037), stock, discounts and offer codes, image upload and hosting, audit history, and shop browse features. The riskiest parts are (1) AC6, where every mutation must sit inside the single `requireAdmin` scope and leave the store unchanged on 401/403, and (2) the NOT NULL sub-category rule, enforced at the API schema and at the database. Deliberate choices: hard delete with no Undo, price stored as integer paise, `buildApp` defaulting to an in-memory store for tests while `server.ts` always passes the `pg` store, and mutations going through Next server actions that forward the cookie rather than from the browser.
