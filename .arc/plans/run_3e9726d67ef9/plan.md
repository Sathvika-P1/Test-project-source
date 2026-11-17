summary: |
  Let signed-in staff (the existing admin role) manage orders end to end. The Shop API gains admin-gated order endpoints (list, detail with the customer's support request, set status, cancel) backed by PostgreSQL; the Web App gains the approved "Admin orders" list and "Admin order" detail screens under /admin/orders, plus an Orders tab in AdminTabs. No orders or support-request storage exists yet in the repo (no migrations, no pg usage, no order code - verified by grep), so this story creates the minimal `orders`, `order_items` and `support_requests` tables, a store behind an injectable interface, and a migration. Refunds, customer notification, replying to support requests and shopper-initiated cancellation are out of scope per the story.
scope:
  - description: |
      DB schema + migration runner. Add `apps/api/migrations/001_orders.sql` creating `orders` (id text PK, customer_name, customer_email, delivery_address, payment_summary, total_minor integer, currency char(3) default 'INR', status text NOT NULL default 'placed' CHECK (status IN ('placed','packed','shipped','delivered','cancelled')), placed_at timestamptz, updated_at timestamptz), `order_items` (order_id FK, position, name, detail, price_minor) and `support_requests` (id, order_id FK UNIQUE-per-order for this release, subject, message, created_at). Add `apps/api/src/db/pool.ts` (pg Pool from DATABASE_URL) and `apps/api/src/db/migrate.ts` (applies *.sql files in order, tracked in a `schema_migrations` table, idempotent) with a `migrate` script in package.json.
    files:
      - apps/api/migrations/001_orders.sql
      - apps/api/src/db/pool.ts
      - apps/api/src/db/migrate.ts
      - apps/api/package.json
    rationale: |
      Orders are the system of record in PostgreSQL (ADR-0003) but nothing creates them yet. Checkout (a separate story) will write into this same schema; this story only reads them and updates status.
  - description: |
      Order store + status rules. Create `apps/api/src/orders/store.ts` exporting the interface and a pg implementation, and `apps/api/src/orders/status.ts` with the pure transition rules.

      ```ts
      export type OrderStatus = 'placed' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
      export interface OrderSummary { id: string; customer: string; placedAt: string; status: OrderStatus; hasSupportRequest: boolean; total: number; currency: string }
      export interface SupportRequest { subject: string; message: string; sentAt: string }
      export interface OrderDetail extends OrderSummary { email: string; address: string; payment: string; items: { name: string; detail: string; price: number }[]; supportRequest: SupportRequest | null }
      export interface OrderStore {
        list(): Promise<OrderSummary[]>;               // newest first
        get(id: string): Promise<OrderDetail | null>;
        setStatus(id: string, status: Exclude<OrderStatus, 'cancelled'>): Promise<OrderDetail | 'not-found' | 'cancelled'>;
        cancel(id: string): Promise<OrderDetail | 'not-found'>;   // idempotent on an already-cancelled order
      }
      ```
      The pg `setStatus` updates `WHERE id = $1 AND status <> 'cancelled'` in one statement so a race cannot un-cancel an order. Prices are stored in minor units and returned in whole units (matches the prototype's `money()`), currency INR as in the prototype.
    files:
      - apps/api/src/orders/store.ts
      - apps/api/src/orders/status.ts
    rationale: |
      A store interface lets route tests inject an in-memory fake (the same injection style as `resolveSession` in app.ts) while production uses pg.
  - description: |
      Admin order routes. Add `apps/api/src/routes/adminOrders.ts` registered inside the gated admin scope so the single `requireAdmin` preHandler covers it (no per-route role check). Endpoints:
      - `GET /admin/orders` -> `{ orders: OrderSummary[] }`
      - `GET /admin/orders/:id` -> OrderDetail, 404 `{error:'not_found'}`
      - `PATCH /admin/orders/:id/status` body `{ status: 'placed'|'packed'|'shipped'|'delivered' }` -> OrderDetail; 400 for any other value (including 'cancelled', which has its own endpoint); 409 `{error:'order_cancelled'}` when cancelled; 404 unknown
      - `POST /admin/orders/:id/cancel` -> OrderDetail with status 'cancelled'
      Extend `AppOptions` in `apps/api/src/app.ts` with `orderStore?: OrderStore` (default: pg store built from the pool in `server.ts`; `buildApp()` without one registers no order routes so existing tests are untouched) and pass it through `adminRoutes` options in `apps/api/src/routes/admin.ts`.
    files:
      - apps/api/src/routes/adminOrders.ts
      - apps/api/src/routes/admin.ts
      - apps/api/src/app.ts
      - apps/api/src/server.ts
      - apps/api/src/config.ts
    rationale: |
      Keeps the one-hook admin gate from STORY-035 as the only authorisation point; shoppers get 403 and signed-out visitors 401 with no order data.
  - description: |
      Web data layer + server actions. Add `apps/web/src/lib/adminOrders.ts` with `getOrders(cookieHeader)` and `getOrder(cookieHeader, id)` that fetch `${API_BASE_URL}/admin/orders` forwarding the session cookie with `cache: "no-store"`, returning a discriminated result (`ok` / `not-found` / `error`), failing closed like `getAdminAccess` in `apps/web/src/lib/adminAccess.ts`. Add `apps/web/src/app/admin/orders/actions.ts` ("use server") with `saveStatus(id, status)` and `cancelOrder(id)` which forward the cookie to the PATCH/POST endpoints and `revalidatePath` the list and detail pages.
    files:
      - apps/web/src/lib/adminOrders.ts
      - apps/web/src/app/admin/orders/actions.ts
    rationale: |
      Mirrors how the admin layout already talks to the API server-side; the browser never holds the API origin or a second credential.
  - description: |
      Orders list screen ("Admin orders" in the prototype). `apps/web/src/app/admin/orders/page.tsx` (server component) renders a `.card` containing `<table class="orders">` with caption `<span role="status">N orders</span>` and columns Order, Customer, Placed, Status, Support, Total, Details; each row has `td` `data-label` attributes so the CSS turns rows into cards below 48rem, and an "Open order" `.btn-secondary` link (aria-label "Open order <id>") to `/admin/orders/<id>`. Support column shows `.badge.badge-warning` "Support request" or muted "None". States from the prototype: `loading.tsx` (a `role="status"` "Loading orders…" with four `.skeleton.sk`), empty (`.empty-state.card.stack`, h2 "No orders yet", copy about orders appearing at checkout, secondary "Go to products" link to /admin/products), error (`.alert.alert-danger` "Couldn't load orders" with a "Try again" `.btn-secondary` that reloads). Shared component `apps/web/src/components/admin/OrderStatusBadge.tsx` maps placed->badge-neutral, packed/shipped->badge-warning, delivered->badge-success, cancelled->badge-danger (the prototype's BADGE map), with sentence-case labels.
    files:
      - apps/web/src/app/admin/orders/page.tsx
      - apps/web/src/app/admin/orders/loading.tsx
      - apps/web/src/components/admin/OrderStatusBadge.tsx
    rationale: |
      Covers AC1. New component is justified: the existing catalogue (Hero, AccessGate, AdminTabs) has no status badge; it wraps the design-system `.badge-*` classes.
  - description: |
      Order detail screen ("Admin order"). `apps/web/src/app/admin/orders/[id]/page.tsx` (server) shows a "Back to orders" `.btn-ghost` link, `<h1>Order <id></h1>` with "Placed <date> by <customer>", a Status `.card` (current status badge in `role="status"`), an "Order details" `.card` (`<dl class="meta">` Customer/Deliver to/Payment, `.line` rows per item, `.total`), and, ONLY when `supportRequest` is non-null, an `<aside class="card support stack">` "Support request" with a "From customer" `.badge-warning`, subject, "Sent <date> by <customer>" and a `<blockquote>` message; the wrapper uses `.split.has-support` only then (two columns >= 48rem, stacked below). No placeholder when absent (AC4). A 404 from the API renders Next `notFound()`; fetch failure renders the `.alert-danger` "Couldn't load this order" with Try again + Back to orders; `loading.tsx` shows three skeletons. Client component `apps/web/src/components/admin/OrderActions.tsx` ("use client"): `.field` with `<label for>` Set status + `.input` select (Placed, Packed, Shipped, Delivered) and the single `.btn-primary` "Save status" (disabled and "Saving…" while pending, then focus returns to it and a `.toast` "Status saved: <status>"); `.btn-danger` "Cancel order" opens a `.modal` with `.backdrop` (role=dialog, aria-modal, labelled title "Cancel order <id>?", copy "The order will show as Cancelled and can't be moved to another status. Refunds and customer notices aren't sent from here yet.", Esc closes, focus trapped, buttons "Cancel order" `.btn-danger` / "Keep order" `.btn-secondary`) then toast "Order cancelled". When cancelled, the form and Cancel button are not rendered and the card says "This order is cancelled, so its status can no longer change." A failed save shows an `.alert-danger` in the status card with "Try again" guidance. Extend `AdminTabs.tsx` TABS with `{ id: "orders", label: "Orders", href: "/admin/orders" }` (prototype: "The bar's tab set gains Orders").
    files:
      - apps/web/src/app/admin/orders/[id]/page.tsx
      - apps/web/src/app/admin/orders/[id]/loading.tsx
      - apps/web/src/components/admin/OrderActions.tsx
      - apps/web/src/components/admin/AdminTabs.tsx
    rationale: |
      Covers AC2-AC6. Modal confirmation for the destructive action follows UI-GUIDELINES ("btn-danger only behind a modal"); one btn-primary per region.
  - description: |
      Styling. Append to `apps/web/src/app/admin/admin.css` the prototype's order rules, using tokens only: `.orders` table (+ `@media (max-width: 47.99rem)` card layout using `attr(data-label)`), `.split`/`.split.has-support` (`minmax(0,2fr) minmax(0,1fr)` at min-width 48rem), `.meta`, `.line`, `.total`, `.support` (border `var(--color-warning)`), `.support blockquote`, `.status-row`, `.back`, toast and modal placement (`var(--z-toast)`, `var(--z-overlay)`, `var(--size-toast)`, `var(--size-modal)`), `.sr-only`. Tokens used: --space-1..6, --radius-md/lg, --border-width, --color-border, --color-border-strong, --color-fg-muted, --color-warning, --color-fg, --color-bg, --font-size-sm/xl, --font-weight-medium/bold, --size-grid-min, --size-menu. `.page`, `.page-head`, `.muted`, `.admin-bar`, `.sk`, `.row` already exist there; `.card`, `.badge-*`, `.btn-*`, `.field`, `.input`, `.modal`, `.backdrop`, `.alert*`, `.skeleton`, `.empty-state`, `.divider` come from `design-system/prototype-utils.css`, already imported in `apps/web/src/app/globals.css` lines 2-3 together with `tokens.css`. The prototype's raw `4px` blockquote border and `44px` min button height have no token; use `calc(var(--border-width) * 4)` and `var(--size-control-lg)`-based sizing and list it as an open question.
    files:
      - apps/web/src/app/admin/admin.css
    rationale: |
      The design system supplies tokens and base components; only the order-specific layout rules are new.
tests:
  - |
    AC1 (API, write first) in `apps/api/src/routes/adminOrders.test.ts` with an in-memory OrderStore: a signed-in admin sees the orders, newest first, and others are denied.
    ```ts
    const res = await app.inject({ method: 'GET', url: '/admin/orders' });
    expect(res.statusCode).toBe(200);
    expect(res.json().orders.map((o: { id: string }) => o.id)).toEqual(['SW-10482', 'SW-10477']);
    // shopper -> 403, signed out -> 401, and neither body contains an order id
    expect(shopperRes.statusCode).toBe(403);
    expect(shopperRes.body).not.toContain('SW-10482');
    ```
  - |
    AC1 (Web, `apps/web/tests/unit/AdminOrdersPage.test.tsx`, mocking `@/lib/adminOrders`): the list page renders one row per order with status badge and a link to the order, plus the empty and error states.
    ```tsx
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2 orders
    expect(screen.getByRole("link", { name: "Open order SW-10482" })).toHaveAttribute("href", "/admin/orders/SW-10482");
    expect(screen.getByText("2 orders")).toBeInTheDocument();
    ```
  - |
    AC2 (API): `GET /admin/orders/:id` returns the full detail; unknown id is 404.
    ```ts
    const res = await app.inject({ method: 'GET', url: '/admin/orders/SW-10482' });
    expect(res.json()).toMatchObject({ id: 'SW-10482', email: 'arjun@example.com', items: [expect.objectContaining({ name: 'Block-print cotton kurta' }), expect.anything()] });
    expect((await app.inject({ method: 'GET', url: '/admin/orders/nope' })).statusCode).toBe(404);
    ```
  - |
    AC2 (Web, `apps/web/tests/unit/AdminOrderPage.test.tsx`): the detail page shows customer, delivery address, payment, items and total.
    ```tsx
    expect(screen.getByRole("heading", { name: "Order SW-10482" })).toBeInTheDocument();
    expect(screen.getByText("12 Lake View Road, Indiranagar, Bengaluru 560038")).toBeInTheDocument();
    ```
  - |
    AC3 (API + Web): an order with a support request returns it and the page shows it beside the order.
    ```ts
    expect(res.json().supportRequest).toEqual({ subject: 'Change delivery address', message: expect.stringContaining('office'), sentAt: expect.any(String) });
    ```
    ```tsx
    const aside = screen.getByRole("complementary", { name: "Support request" });
    expect(within(aside).getByText("Change delivery address")).toBeInTheDocument();
    ```
  - |
    AC4 (API + Web): an order without one has `supportRequest: null` and the page renders no support card.
    ```ts
    expect(res.json().supportRequest).toBeNull();
    ```
    ```tsx
    expect(screen.queryByRole("complementary", { name: "Support request" })).toBeNull();
    expect(screen.queryByText(/support request/i)).toBeNull();
    ```
  - |
    AC5 (API): setting packed, shipped, delivered is persisted and returned; invalid or 'cancelled' status is 400; a cancelled order is 409 and stays cancelled.
    ```ts
    for (const status of ['packed', 'shipped', 'delivered']) {
      const res = await app.inject({ method: 'PATCH', url: '/admin/orders/SW-10482/status', payload: { status } });
      expect(res.json().status).toBe(status);
    }
    expect((await app.inject({ method: 'PATCH', url: '/admin/orders/SW-10482/status', payload: { status: 'cancelled' } })).statusCode).toBe(400);
    expect(cancelledRes.statusCode).toBe(409);
    ```
  - |
    AC5 (Web, `apps/web/tests/unit/OrderActions.test.tsx`, mocking `./actions`): choosing Shipped and pressing Save status calls the action and shows the saved status.
    ```tsx
    await user.selectOptions(screen.getByLabelText("Set status"), "Shipped");
    await user.click(screen.getByRole("button", { name: "Save status" }));
    expect(saveStatus).toHaveBeenCalledWith("SW-10482", "shipped");
    expect(await screen.findByText("Status saved: Shipped")).toBeInTheDocument();
    ```
  - |
    AC6 (API): cancelling a non-cancelled order sets cancelled; cancelling again does not error.
    ```ts
    const res = await app.inject({ method: 'POST', url: '/admin/orders/SW-10477/cancel' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('cancelled');
    ```
  - |
    AC6 (Web, `OrderActions.test.tsx`): Cancel order opens a confirmation; confirming calls the action; a cancelled order has no form and no Cancel button.
    ```tsx
    await user.click(screen.getByRole("button", { name: "Cancel order" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel order" }));
    expect(cancelOrder).toHaveBeenCalledWith("SW-10477");
    ```
    ```tsx
    render(<OrderActions order={{ ...order, status: "cancelled" }} />);
    expect(screen.queryByRole("button", { name: "Cancel order" })).toBeNull();
    expect(screen.getByText(/status can no longer change/i)).toBeInTheDocument();
    ```
  - |
    Store tests (`apps/api/src/orders/store.test.ts`, vitest) for the status rules in `status.ts` (pure function: cancelled is terminal) and, when `DATABASE_URL` is set, the pg store against a migrated scratch database (list order, support request join, race-safe cancel). Also an AdminTabs assertion in `AdminLayout.test.tsx`: `expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("href", "/admin/orders")`.
  - |
    Playwright smoke (`apps/web/e2e/admin-orders.spec.ts`, only if the existing e2e setup can seed a session): open the list, open an order with a support request, set Shipped, cancel and see Cancelled.
assumptions_or_open_questions:
  - |
    No orders, order items or support requests exist anywhere in the repo yet (no migrations, no pg usage, nothing in apps/). Checkout & orders and the customer support-request submission are separate stories. This plan creates the minimal schema and treats rows as written by those stories; until they ship, the list is empty in a real deployment (the prototype's empty state). The data model (single status column, one support request per order, items as rows) is my assumption from the prototype and should be reconciled with Checkout's schema if that lands first or in parallel.
  - |
    Status set: the prototype's select offers Placed, Packed, Shipped, Delivered, with Cancelled via its own button, any non-cancelled order cancellable, cancelled final (no un-cancel). The AC only names packed/shipped/delivered; I kept "placed" selectable per the prototype. Transitions between non-cancelled statuses are unrestricted (including going backwards); confirm whether staff should be limited to forward moves.
  - |
    A cancelled order's status cannot change (409) - taken from the prototype's design plan, not from the AC text.
  - |
    Session sign-in is still deny-all by default (`denyAllResolver`); production wiring of a real `resolveSession` belongs to the sign-in work, so the pages are reachable only once that exists. `server.ts` must be wired with the pg order store; DATABASE_URL has no documented default - the API fails to start the order routes without it.
  - |
    Deferred project-wide questions: how long records of who changed what and when are kept (EPIC-009), and launch environments / backup and recovery (CHORE-011). This story stores `updated_at` only and does NOT add an audit trail of who changed a status; if audit history is required, it is a follow-up. Retention and backup are not decided here.
  - |
    Prototype vs ACs: no conflict. The prototype's "Support" column and "From customer" badge are kept. Replying to a support request is not offered (the screen says so). Currency is INR as in the prototype; the store should be confirmed as INR-only.
  - |
    Two prototype values have no design token: the 4px blockquote rule and the 44px minimum button height (the design system's controls are 40/48px). Plan uses token-derived values; confirm the 44px touch target should be dropped or tokenised.
  - |
    Pagination: the list returns all orders (the prototype shows no pager). With up to ~1,000 daily users (ADR-0004) this is acceptable for now; add paging if order volume grows.
estimated_points: 8
package_dependencies: []
notes: |
  ### Data & rollout
  - **Existing data**: new tables only (`orders`, `order_items`, `support_requests`); no existing table is altered, so no existing row is affected. The Web App needs no stored data change.
  - **Backfill / seed**: none required. Orders arrive from Checkout. The migration runner records applied files in `schema_migrations` and is idempotent and safe to re-run; `CREATE TABLE` statements are not run twice because of that tracking. Local/dev sample rows (the prototype's five orders) may be inserted by a developer seed script only, never by the migration.
  - **Settings**: `DATABASE_URL` (API) for the pg pool; no safe default (unset means order routes are not registered and the API logs why). `API_BASE_URL` already exists for the Web App (default http://localhost:3000, see apps/web/src/lib/adminAccess.ts). Document both in `apps/api/src/config.ts` comments / the README.
  - **Provisioning**: a PostgreSQL database reachable from the API, and an admin-role session resolver (separate work). Launch environments are an open project question (CHORE-011), so no environment-specific setup is planned here.
  - **Order and rollback**: deploy order is `pnpm --filter comp-shop-api migrate` (or `cd apps/api && pnpm run migrate`) first, then the API, then the Web App. Rollback: the tables are additive and unused by older code, so leaving them in place is safe; to remove, drop `support_requests`, `order_items`, `orders` and the `schema_migrations` row.
  - **Migration test**: a test applies `001_orders.sql` twice through `migrate.ts` and asserts the second run is a no-op.

  ### Reuse and design
  Reused: AdminTabs (extended with Orders), the admin layout role check in `apps/web/src/app/admin/layout.tsx` (the single gate; new pages carry no role check), `admin.css` page/admin-bar/sk/row rules, and `.card`, `.badge-*`, `.btn-*`, `.field`, `.input`, `.modal`, `.backdrop`, `.alert*`, `.skeleton`, `.empty-state` from `design-system/prototype-utils.css`. New: OrderStatusBadge and OrderActions (prototype names them "Order status badge", "Status update form"; the support request card is inline markup in the detail page). Tokens are loaded by `apps/web/src/app/globals.css` lines 2-3. Copy follows the guidelines: sentence case, verb-first buttons, errors say what to do next.

  ```mermaid
  flowchart TD
    Browser --> OrdersPage["web admin/orders pages"]
    OrdersPage --> Layout["admin/layout.tsx (role gate)"]
    OrdersPage --> WebLib["lib/adminOrders.ts + actions.ts"]
    WebLib -->|cookie forwarded| AdminRoutes["api routes/admin.ts (requireAdmin hook)"]
    AdminRoutes --> OrderRoutes["routes/adminOrders.ts"]
    OrderRoutes --> Store["orders/store.ts"]
    Store --> PG[(PostgreSQL)]
    AppTs["api app.ts"] --> AdminRoutes
    Tabs["components/admin/AdminTabs.tsx"] --> OrdersPage
    classDef touched fill:#f96,color:#000
    class OrdersPage,WebLib,AdminRoutes,OrderRoutes,Store,AppTs,Tabs touched
  ```
  Touched nodes: AdminRoutes/AppTs pass the injected store down to the gated scope; OrderRoutes and Store are new; Tabs gets the Orders link; Layout is untouched context.
review_focus: |
  IN: admin-gated order list/detail/status/cancel in the Shop API (new minimal PostgreSQL schema + store) and the two approved screens in the Web App. OUT: refunds, customer notification, support-request replies, shopper cancellation, audit trail, order creation. Riskiest: authorisation (all routes must sit behind the single requireAdmin hook, shoppers get no order data) and the cancel/status race (cancelled must stay final, enforced in one SQL statement). Deliberate: the schema is created here because nothing exists yet, an injectable OrderStore keeps tests off the database, and the support card is omitted entirely (not an empty placeholder) when no request exists.
