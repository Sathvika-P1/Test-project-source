summary: |
  Add the Customer Support screen (`/support`) in the Web App and a `POST /support-requests` endpoint in the Shop API. The screen shows an Order number field, a Topic select with exactly the five topics, a Message textarea, a Send button and a Back to home link, built from the approved prototype and styled only with the design-system tokens and stylesheet. Send is blocked client-side when any field is empty. The API refuses (stores nothing) when the shopper is not signed in, when a field is missing or invalid, or when the order number is not one of the shopper's own orders, and otherwise stores the request in PostgreSQL (`support_requests`) so staff can read it. The confirmation and error display (story 017) and the admin view (story 018) are out of scope.

review_focus: |
  IN: the `/support` form with Back to home, the `POST /support-requests` route (401 signed out, 400 invalid, 422 not own order, 201 stored), the `support_requests` migration, and loading the design system into the web app. OUT: confirmation and error display (story 017), the admin view (story 018), shell navigation, sign-in, and the orders feature. Riskiest part: sign-in and orders do not exist in the repo, so the route depends on injected `SessionResolver` and `OrderOwnership` ports with a fail-closed default and an assumed `orders(order_number, customer_id)` table; reviewers should check that nothing stores a request unless both checks pass and that a missing or foreign order gives the same response. Deliberate: no visible error or success message in this story, and no rate limiting beyond field length caps.

scope:
  - description: |
      API storage: migration SQL creating `support_requests` and a store behind a small interface, with a pg-backed implementation.

      ```sql
      CREATE TABLE IF NOT EXISTS support_requests (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        shopper_id TEXT NOT NULL,
        order_number TEXT NOT NULL,
        topic TEXT NOT NULL CHECK (topic IN ('Delivery delay','Wrong or damaged item','Refund or return','Cancel or change order','Other')),
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS support_requests_created_at_idx ON support_requests (created_at DESC);
      ```

      ```ts
      export interface SupportRequestStore {
        create(input: NewSupportRequest): Promise<StoredSupportRequest>;
      }
      export class PgSupportRequestStore implements SupportRequestStore {
        constructor(private readonly db: { query: Pool['query'] }) {}
      }
      ```
    files:
      - apps/api/migrations/001_create_support_requests.sql
      - apps/api/src/support/store.ts
      - apps/api/src/support/pg-store.ts
    rationale: |
      Answers the deferred question on where requests are stored: PostgreSQL (ADR-0003; `pg` is already a dependency and `config.databaseUrl` exists). Staff read the same table in story 018, so no separate delivery channel is built here (ADR-0006: no third-party integrations).

  - description: |
      API topics and validation. A single source of truth for the five topics plus a pure validator that trims, upper-cases the order number, and returns field errors.

      ```ts
      export const SUPPORT_TOPICS = ['Delivery delay','Wrong or damaged item','Refund or return','Cancel or change order','Other'] as const;
      export const MAX_MESSAGE_LENGTH = 2000;
      export function validateSupportRequest(body: unknown):
        | { ok: true; value: { topic: SupportTopic; orderNumber: string; message: string } }
        | { ok: false; fields: Array<'topic' | 'orderNumber' | 'message'> };
      ```
    files:
      - apps/api/src/support/validate.ts
    rationale: |
      Covers AC 2 (exact topic list) and AC 3 (any empty field means not sent) on the server, which is the authority. Also caps length (message 2000, order number 32) as the only spam/abuse control inside this story.

  - description: |
      API route `POST /support-requests` with injected collaborators so tests need no database or real sign-in.

      ```ts
      export interface SessionResolver { resolve(req: FastifyRequest): Promise<{ shopperId: string } | null>; }
      export interface OrderOwnership { ownsOrder(shopperId: string, orderNumber: string): Promise<boolean>; }
      export interface AppDeps { sessions: SessionResolver; orders: OrderOwnership; supportRequests: SupportRequestStore; }
      // before -> after
      export function buildApp(): FastifyInstance;
      export function buildApp(deps?: Partial<AppDeps>): FastifyInstance;
      ```

      Order of checks: 401 `{ error: 'not_signed_in' }` if no session; 400 `{ error: 'invalid_request', fields }` if validation fails; 422 `{ error: 'order_not_found' }` if `ownsOrder` is false (same answer for a missing order and someone else's, so order numbers cannot be probed); else store and return 201 `{ id }`. With no deps passed, `sessions` resolves to null (everyone signed out), so the existing `buildApp()` health test is unaffected. `app.ts` currently registers only `healthRoutes` (`apps/api/src/app.ts`).
    files:
      - apps/api/src/routes/support.ts
      - apps/api/src/support/deps.ts
      - apps/api/src/app.ts
    rationale: |
      Covers AC 4, 5, 6. The repo has no sign-in or orders code (searched `apps/` for auth, session, order, support), so the route depends on two narrow ports rather than inventing an auth scheme. The default of nobody signed in fails closed.

  - description: |
      API production wiring in `server.ts`: create a `pg` Pool from `config.databaseUrl`, build `PgSupportRequestStore`, and a pg-backed `OrderOwnership` that runs `SELECT 1 FROM orders WHERE order_number = $1 AND customer_id = $2`. Add an npm script `migrate` that applies `apps/api/migrations/*.sql` in filename order (plain `tsx src/migrate.ts` using `pg`, no new dependency). The session resolver stays the fail-closed default until the sign-in story supplies one.
    files:
      - apps/api/src/server.ts
      - apps/api/src/support/pg-orders.ts
      - apps/api/src/migrate.ts
      - apps/api/package.json
    rationale: |
      Makes the stored path real for a deployment, not only for tests. The `orders` table and `customer_id` column are an assumption owned by Checkout & orders (see open questions).

  - description: |
      Web: load the design system once. In `globals.css`, after `@import "tailwindcss";`, import `../../../../design-system/tokens.css` and `../../../../design-system/prototype-utils.css` (path relative to `apps/web/src/app/`). Today `globals.css` holds only the Tailwind import, so no token or component class (`.field`, `.input`, `.select`, `.textarea`, `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-sm`, `.stack`, `.container`, `.text-muted`) is defined for the app. They are defined in `design-system/prototype-utils.css`. Verify the import resolves under the Next build and that the home page (Hero uses Tailwind classes) still renders.
    files:
      - apps/web/src/app/globals.css
    rationale: |
      The prototype's classes come from these two files; without the import the page would be unstyled. The utilities set `body`, `h1`, `a` globally, hence the home-page regression check.

  - description: |
      Web: support client helper and API proxy. `sendSupportRequest(input)` POSTs to `/api/support-requests` with the JSON body and resolves to `{ sent: boolean }` (true only on HTTP 201). `next.config.ts` gets a rewrite `/api/:path*` to `${process.env.API_URL ?? 'http://localhost:3001'}/:path*` so the browser stays same-origin and a session cookie reaches the API.

      ```ts
      export type SupportRequestInput = { topic: string; orderNumber: string; message: string };
      export async function sendSupportRequest(input: SupportRequestInput): Promise<{ sent: boolean }>;
      ```
    files:
      - apps/web/src/lib/support.ts
      - apps/web/next.config.ts
    rationale: |
      Keeps fetch logic out of the component so it is mockable in the unit test. The rewrite avoids CORS and cookie-domain work for a story that does not own sign-in.

  - description: |
      Web: `SupportForm` client component and the `/support` page, built from the prototype's default state. Markup in prototype order: a Back to home link (Next `Link` to `/`, `className="btn btn-ghost btn-sm back"`, arrow-left icon, text "Back to home") above the `h1` "Customer support" and the muted intro paragraph; then `<form className="stack" noValidate>` with three `.field` blocks: Order number (`.input`, placeholder "e.g. SW-10482", hint "It starts with SW- and is in your order confirmation email."), Topic (`.select`, first option "Choose a topic" that is `disabled hidden` and selected, then the five topics from one exported constant), Message (`.textarea`, rows 5, placeholder "Describe your issue"); then one `<button type="submit" className="btn btn-primary">Send request</button>`. Every control has a `<label htmlFor>` and `aria-required="true"`. Wrapper `.support` is `max-width: var(--size-modal)`, the heading uses `--font-size-xl` and `--line-height-tight`, margins from `--space-3` and `--space-1`, as in the prototype; define these few prototype-local rules in `globals.css` on the same tokens. The page sits inside the `.container` (`--size-container`, `--space-3` padding).

      Submit handler: trim values; if topic, order number or message is empty, do not call `sendSupportRequest`, mark the empty controls `aria-invalid="true"` plus `.is-invalid`, and focus the first (AC 3). Otherwise call `sendSupportRequest`; while pending, disable the button and show `.spinner` with "Sending…" (prototype sending state, tokens only). The result is not displayed (story 017).
    files:
      - apps/web/src/components/SupportForm.tsx
      - apps/web/src/app/support/page.tsx
      - apps/web/src/app/globals.css
    rationale: |
      Covers AC 1, 2, 3, 7, 8 on the screen. The existing `Hero` component does not apply (the prototype uses a plain `h1`). Per UI guidelines: one `.btn-primary` per region, sentence case, verb-first button label.

  - description: |
      Tests, written first, for each layer (details in `tests`): API unit tests `apps/api/src/support/validate.test.ts`, `apps/api/src/support/pg-store.test.ts` and `apps/api/src/routes/support.test.ts` (Fastify `inject` with in-memory fakes); API e2e `apps/api/test/e2e/support.e2e.ts` with supertest; web unit tests `apps/web/tests/unit/SupportForm.test.tsx`; Playwright `apps/web/e2e/support.spec.ts` for Back to home.
    files:
      - apps/api/src/support/validate.test.ts
      - apps/api/src/support/pg-store.test.ts
      - apps/api/src/routes/support.test.ts
      - apps/api/test/e2e/support.e2e.ts
      - apps/web/tests/unit/SupportForm.test.tsx
      - apps/web/e2e/support.spec.ts
    rationale: |
      TDD per acceptance criterion. The unit command globs are `src/**/*.test.ts` (api) and `tests/unit/**/*.test.{ts,tsx}` (web), so unit tests must live there.

tests:
  - |
    AC 1 (web, `SupportForm.test.tsx`) fails first because the component does not exist:
    ```tsx
    render(<SupportForm />);
    expect(screen.getByLabelText("Order number")).toBeInTheDocument();
    expect(screen.getByLabelText("Topic")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
    ```
  - |
    AC 2 (web). The "Choose a topic" placeholder is `hidden`, so it is excluded from the accessible options:
    ```tsx
    const names = screen.getAllByRole("option").map((o) => o.textContent);
    expect(names).toEqual(["Delivery delay","Wrong or damaged item","Refund or return","Cancel or change order","Other"]);
    ```
    API (`validate.test.ts`):
    ```ts
    expect(SUPPORT_TOPICS).toEqual(['Delivery delay','Wrong or damaged item','Refund or return','Cancel or change order','Other']);
    expect(validateSupportRequest({ topic: 'Nope', orderNumber: 'SW-1', message: 'x' })).toEqual({ ok: false, fields: ['topic'] });
    ```
  - |
    AC 3 (web), once per empty field using `it.each(["topic","order","message"])`: fill the other two, leave one empty, click Send.
    ```tsx
    const send = vi.spyOn(supportLib, "sendSupportRequest");
    await user.click(screen.getByRole("button", { name: /send/i }));
    expect(send).not.toHaveBeenCalled();
    ```
    API (`support.test.ts`): `POST /support-requests` with an empty message (signed in, owned order):
    ```ts
    expect(res.statusCode).toBe(400);
    expect(store.created).toHaveLength(0);
    ```
    Same for empty topic and empty order number. Whitespace-only counts as empty.
  - |
    AC 4 (API, `support.test.ts` and e2e) with `sessions: { resolve: async () => null }` and a valid body for an owned order:
    ```ts
    expect(res.statusCode).toBe(401);
    expect(store.created).toHaveLength(0);
    ```
    Also assert the default `buildApp()` (no deps) answers 401 to a valid body, proving it fails closed.
  - |
    AC 5 (API) with a signed-in fake session (`{ shopperId: 'shopper-1' }`), a valid topic and message, and `ownsOrder` returning false for `SW-10099`:
    ```ts
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ error: 'order_not_found' });
    expect(store.created).toHaveLength(0);
    expect(ownsOrder).toHaveBeenCalledWith('shopper-1', 'SW-10099');
    ```
  - |
    AC 6 (API unit and supertest e2e) with a signed-in session and `ownsOrder` true for `SW-10482`; send `orderNumber: ' sw-10482 '` to prove normalisation:
    ```ts
    expect(res.statusCode).toBe(201);
    expect(store.created).toEqual([{ shopperId: 'shopper-1', orderNumber: 'SW-10482', topic: 'Wrong or damaged item', message: 'The mug arrived chipped.' }]);
    ```
    Web, with all three filled:
    ```tsx
    expect(send).toHaveBeenCalledWith({ topic: "Wrong or damaged item", orderNumber: "SW-10482", message: "The mug arrived chipped." });
    ```
    `pg-store.test.ts`: a fake `query` asserts the INSERT text targets `support_requests` and passes the values as parameters, not interpolated.
  - |
    AC 7 (web unit and Playwright). Unit:
    ```tsx
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
    ```
    Playwright (`support.spec.ts`):
    ```ts
    await page.goto("/support");
    await page.getByRole("link", { name: "Back to home" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Shopping Website" })).toBeVisible();
    ```
  - |
    AC 8 (web unit and Playwright):
    ```tsx
    render(<SupportForm />);
    expect(screen.getByRole("link", { name: /back to home/i })).toBeVisible();
    ```
    Playwright asserts the same link is visible on `/support`.
  - |
    Regression: existing `apps/api/src/app.test.ts` (`GET /health` returns `{ status: 'ok' }`), `apps/api/test/e2e/health.e2e.ts`, `apps/web/tests/unit/Hero.test.tsx` and `apps/web/e2e/home.spec.ts` still pass with the `buildApp(deps?)` signature and the new `globals.css` imports. Narrow commands: `(cd apps/api && pnpm run test -- src/routes/support.test.ts)` and `(cd apps/web && pnpm test -- tests/unit/SupportForm.test.tsx)`.

assumptions_or_open_questions:
  - |
    BLOCKER TO CONFIRM: the repository has no sign-in, session or orders code (searched `apps/` excluding node_modules; the only source files are health route, app, server, config, Hero and the home page). This plan adds the route against two ports (`SessionResolver`, `OrderOwnership`) with a fail-closed default (nobody signed in), so in a real deployment every send is refused with 401 until the sign-in story provides a `SessionResolver`. Which story delivers sign-in, and what is the session mechanism (cookie or bearer token)? The web rewrite assumes a cookie that reaches the API through the same-origin proxy.
  - |
    The `orders` table (`order_number`, `customer_id`) used by `pg-orders.ts` is an assumption; no schema exists yet. If Checkout and orders defines different names, only `pg-orders.ts` changes. If orders do not exist when this ships, AC 6 cannot succeed for a real shopper.
  - |
    Deferred question on spam and repeated submissions: this plan only adds length caps, trimming and the signed-in plus own-order requirement (which already prevents anonymous automated posting). Per-shopper rate limiting or duplicate suppression is not planned (it would need `@fastify/rate-limit` or a store query). Is that acceptable for launch, or should a follow-up be raised?
  - |
    Deferred question on delivery to staff: requests are stored in `support_requests` with `status = 'new'`; no email or notification is sent (ADR-0006 forbids third-party integrations). The admin read view is story 018. Who on the team handles requests in the admin area (epic-level question) is not answerable from the code and is not needed to build this story.
  - |
    Prototype versus acceptance criteria: AC 1 lists topic, order number, message while the prototype orders the fields order number, topic, message. The plan follows the prototype's order (labels are the same, so AC 1 holds). The prototype button reads "Send request" while the ACs say "Send"; tests match `/send/i`.
  - |
    Scope boundary with story 017: the prototype also draws error alerts, per-field messages (`.field-error`, `.alert-danger`, `.alert-warning`) and a "Request sent" view. These are NOT built here. This story only blocks the send and marks empty controls `aria-invalid` and `.is-invalid`; the API result (sent, signed out, not own order) is not shown, so a shopper pressing Send sees no feedback until 017 lands. Please confirm this reading.
  - |
    The prototype's top bar (Home, Shop, Account, Saved, Bag) and "Signed in as" line are not built: the app layout has no navigation yet and neither is in the ACs. The only way home is the Back to home link. Should shell navigation be added here or in a separate story?
  - |
    The API default port is 3000 (`config.ts`), the same as `next dev`. The rewrite assumes `API_URL` defaulting to `http://localhost:3001`; run the API with `PORT=3001` locally. Confirm the intended local ports.
  - |
    Launch environments, backup and recovery expectations (project-wide open question) are not answerable from the repo; the only deployment impact here is that the migration must be applied before the API serves the route.

estimated_points: 5

package_dependencies: []

notes: |
  ### Data & rollout

  - **Existing data**: new table only (`support_requests`); no existing table or row is altered. The route reads the `orders` table (owned by another story) but does not change it.
  - **Backfill / seed**: none needed. The migration uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, so it is safe to re-run. `pnpm run migrate` (in `apps/api`) applies `apps/api/migrations/*.sql` in filename order.
  - **Settings**: `API_URL` (web, used by the `next.config.ts` rewrite; default `http://localhost:3001`, only affects the proxy target), documented with a comment in `next.config.ts`. `DATABASE_URL` already exists in `apps/api/src/config.ts`.
  - **Provisioning**: the PostgreSQL database, the `orders` table (other story), and a real `SessionResolver` (sign-in story). Until the resolver exists the route answers 401 to everyone.
  - **Order and rollback**: run `migrate` first, then deploy the API, then the web app. Rollback: the table is additive, so leaving it in place is safe; to remove it, `DROP TABLE support_requests` (stored requests are lost).

  Tests that touch existing data: none required, since no existing rows change.

  ### Design source

  Read in full: the approved prototype `SHOPPING-WEBSITE-STORY-016-design.html`. Elements used: the default state's form, the Back to home ghost button (arrow-left icon), the `h1` "Customer support", the muted intro, the `.field` blocks with hint text, the Send primary button, and the sending state's spinner button. Tokens used: `--space-1`, `--space-2`, `--space-3`, `--size-modal`, `--size-container`, `--font-size-xl`, `--line-height-tight`, `--color-primary`, `--color-on-primary`, `--color-border-strong`, `--color-danger` (for `.is-invalid`), `--radius-md`, `--size-control-md`, `--opacity-disabled`, `--size-icon`. `design-system/tokens.css` and `design-system/prototype-utils.css` exist in the worktree; the app does not load them today (`globals.css` is only the Tailwind import), hence the import scope item. `.alert`, `.toast` and `.field-error` belong to story 017.

  ### Layering

  ```mermaid
  flowchart TD
    server[server.ts]:::touched -->|wires pg deps| app[app.ts buildApp deps]:::touched
    app -->|registers| support[routes/support.ts]:::touched
    app --> health[routes/health.ts]
    support -->|validates| validate[support/validate.ts]:::touched
    support -->|session check| sessions[SessionResolver port]:::touched
    support -->|own-order check| orders[OrderOwnership port]:::touched
    support -->|stores| store[SupportRequestStore]:::touched
    store --> pgstore[support/pg-store.ts]:::touched
    pgstore --> db[(PostgreSQL support_requests)]
    page[app/support/page.tsx]:::touched --> form[SupportForm.tsx]:::touched
    form --> lib[lib/support.ts]:::touched
    lib -->|POST /api/support-requests via rewrite| nextcfg[next.config.ts]:::touched
    nextcfg --> support
    layout[app/layout.tsx] --> globals[globals.css]:::touched
    globals --> ds[design-system tokens.css and prototype-utils.css]
    classDef touched fill:#f96,color:#000
  ```
