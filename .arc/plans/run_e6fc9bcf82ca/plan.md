summary: |
  Gate the whole administration area (all routes under /admin) by a single admin role, reusing the shopper sign-in session. The Shop API gets a `requireAdmin` Fastify preHandler plus `GET /admin/access` (200 admin / 403 signed-in non-admin / 401 signed-out) so the role is enforced server-side for every future admin endpoint. The Web App gets one server-side `app/admin/layout.tsx` that asks the API once per request and renders either the approved admin shell (tabs bar, "Store administration" overview, a sample-free Products placeholder) or a neutral gate message ("You can't open this page" / "Sign in to continue") that reveals no admin labels. Because the role check lives only in the layout, child admin pages carry no role check of their own (AC4). Important finding: the repo has NO shopper sign-in, session, user or role code yet (grepped auth/session/sign-in/jwt/login across the repo outside node_modules: no hits), so this plan builds the gate against a small injectable session-resolver seam that denies everyone by default; see open questions.
scope:
  - description: |
      API: session seam and admin guard. Add `apps/api/src/auth/session.ts` exporting
      ```ts
      export type Role = 'admin' | 'shopper';
      export interface Session { userId: string; email: string; role: Role }
      export type SessionResolver = (req: FastifyRequest) => Promise<Session | null>;
      export const denyAllResolver: SessionResolver = async () => null;
      ```
      and `apps/api/src/auth/requireAdmin.ts` exporting `requireAdmin(resolve: SessionResolver): preHandlerAsyncHookHandler` that replies 401 `{ error: 'unauthenticated' }` when the resolver returns null, 403 `{ error: 'forbidden' }` when `role !== 'admin'`, otherwise decorates `req.session`. Single role, no finer permissions.
    files:
      - apps/api/src/auth/session.ts
      - apps/api/src/auth/requireAdmin.ts
    rationale: |
      Keeps the gate independent of how the shopper sign-in is implemented (not present in the repo), and fails closed by default.
  - description: |
      API: admin routes plugin. `apps/api/src/routes/admin.ts` registers an encapsulated plugin that applies `requireAdmin` as an `onRequest`/preHandler hook to the whole plugin scope (so any later admin route is gated automatically) and exposes `GET /admin/access` returning `{ role: 'admin', email }`. Change `buildApp` to
      ```ts
      export interface AppOptions { resolveSession?: SessionResolver }
      export function buildApp(opts: AppOptions = {}): FastifyInstance
      ```
      defaulting to `denyAllResolver`, and register `adminRoutes` with it. `/health` stays public.
    files:
      - apps/api/src/routes/admin.ts
      - apps/api/src/app.ts
    rationale: |
      One hook for the whole area satisfies "gates the whole administration area" and AC4 (no per-page role check).
  - description: |
      Web: load the design system once. In `apps/web/src/app/globals.css`, after `@import "tailwindcss";`, import `design-system/tokens.css` and `design-system/prototype-utils.css` (relative path from apps/web/src/app: `../../../../design-system/...`). The app currently loads only Tailwind (globals.css line 1, imported by layout.tsx line 2), so the tokens and the classes the approved design uses (btn-primary, btn-secondary, btn-ghost, card, stack, grid, alert, badge-success, skeleton, field, divider) are not available yet. If Next refuses a CSS import outside apps/web, copy both files under apps/web/src/styles/ and import from there (the implementer decides; do not hand-retype tokens).
    files:
      - apps/web/src/app/globals.css
    rationale: |
      Design plan requires every UI step to use real token names and loaded classes; both are defined in design-system/ (prototype-utils.css defines .badge-success line 156, .alert line 206, .skeleton, .card, .btn-*).
  - description: |
      Web: access helper. `apps/web/src/lib/adminAccess.ts` exporting
      ```ts
      export type AdminAccess =
        | { status: 'admin'; email: string }
        | { status: 'not-admin' }
        | { status: 'signed-out' };
      export async function getAdminAccess(cookieHeader: string | null, fetchImpl?: typeof fetch): Promise<AdminAccess>
      ```
      It calls `GET {API_BASE_URL}/admin/access` forwarding the shopper session cookie; 200 gives admin, 403 not-admin, 401 signed-out; any network/5xx/unknown failure resolves to `not-admin` style denial (fail closed, nothing admin shown). `API_BASE_URL` is a new env var read server-side only.
    files:
      - apps/web/src/lib/adminAccess.ts
    rationale: |
      The Web App owns no data (stack notes: data owned by Shop API), so role is decided by the API.
  - description: |
      Web: gate and shell UI, built from the approved prototype screens "Admin overview" (states default / checking / not-admin / signed-out), "Admin products" and the existing app shell. New components in `apps/web/src/components/admin/`: `AccessGate.tsx` (props `{ variant: 'not-admin' | 'signed-out'; email?: string }`) and `AdminTabs.tsx` (Overview, Products links; the prototype's `.admin-bar` with `<strong>Admin</strong>`, tabs, and "Signed in as {name} <span class="badge-success">Admin</span>"). No existing catalogue component covers either (only Hero exists), so both are new, as the prototype's own design plan states.
      
      Gate copy from the prototype: not-admin card `.gate.card.stack` with h1 "You can't open this page", "Your account doesn't have access to this area. If you think it should, ask a store admin.", muted "Signed in as {email}", `.btn-primary` "Go to Shop" (link to /shop) and `.btn-secondary` "Sign out". Signed-out card: h1 "Sign in to continue", "This page is for store staff. Sign in with your account; if you're an admin you'll come straight back here.", one `.btn-primary` "Sign in" linking to the shopper sign-in with a return-to of /admin. Denied pages show no admin labels (no tabs, no "Admin").
      
      Routes: `apps/web/src/app/admin/layout.tsx` (server component: reads `cookies()`, calls `getAdminAccess`, renders `AccessGate` or `AdminTabs` + children; this is the ONLY role check), `apps/web/src/app/admin/loading.tsx` (the prototype "checking" state: muted "Checking your access…" plus two `.skeleton` blocks inside `.gate`, role=status aria-live=polite), `apps/web/src/app/admin/page.tsx` (h1 "Store administration", muted "Keep the catalogue and orders up to date.", a `.grid` of four `.card.stack` areas: Products and prices, Categories, Stock by size, Orders; each with a `.btn-secondary` that is a disabled/aria-disabled placeholder because those areas are other stories), `apps/web/src/app/admin/products/page.tsx` (h1 "Products", placeholder `.empty-state`; NOT the prototype's invented sample products, no role check, proves AC4).
      
      Styling uses only tokens: `--space-3/4/5/6`, `--size-modal` (gate max-width), `--size-container`, `--color-border`, `--color-fg-muted`, `--font-size-xl/lg/sm`, `--line-height-tight`, `--border-width`, `--radius-md`. The prototype-only helpers (`.page`, `.page-head`, `.admin-bar`, `.gate`, `.muted`, `.row`) are defined only in the prototype's inline style, so define them in `apps/web/src/app/admin/admin.css` on those tokens and import it from the admin layout. Mobile first; the admin bar wraps (`flex-wrap`) as in the prototype. Gate has role=status/heading semantics, buttons are real links/buttons with visible focus from the design system.
    files:
      - apps/web/src/components/admin/AccessGate.tsx
      - apps/web/src/components/admin/AdminTabs.tsx
      - apps/web/src/app/admin/layout.tsx
      - apps/web/src/app/admin/loading.tsx
      - apps/web/src/app/admin/page.tsx
      - apps/web/src/app/admin/products/page.tsx
      - apps/web/src/app/admin/admin.css
    rationale: |
      Implements ACs 1-4 in the UI from the approved prototype; the single layout-level check gives AC4.
  - description: |
      Config and docs: document `API_BASE_URL` (default `http://localhost:3000`, the API's default port in apps/api/src/config.ts; safe if unset in dev) in `apps/web/.env.example` (create if absent after checking).
    files:
      - apps/web/.env.example
    rationale: |
      The only new setting.
tests:
  - |
    AC1 (API, write first, fails because /admin/access does not exist) in apps/api/src/routes/admin.test.ts:
    ```ts
    const app = buildApp({ resolveSession: async () => ({ userId: 'u1', email: 'meera@x.test', role: 'admin' }) });
    const res = await app.inject({ method: 'GET', url: '/admin/access' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ role: 'admin', email: 'meera@x.test' });
    ```
  - |
    AC2 (API): resolver returns `role: 'shopper'`:
    ```ts
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'forbidden' });
    ```
    Also assert the 403 body contains no admin data.
  - |
    AC3 (API): resolver returns null, and the default `buildApp()` with no resolver:
    ```ts
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'unauthenticated' });
    ```
    plus `GET /health` still returns 200 unauthenticated (existing app.test.ts stays green).
  - |
    AC4 (API): a test-registered second route inside the admin plugin scope (e.g. `/admin/ping`) returns 200 for an admin with the resolver called exactly once per request: `expect(resolver).toHaveBeenCalledTimes(1)`; the same route returns 401/403 for signed-out/shopper, proving the whole area is gated by the one hook.
  - |
    AC1-3 (Web unit, vitest, apps/web/tests/unit/AdminLayout.test.tsx): mock `@/lib/adminAccess`; render the awaited layout with `{status:'admin'}` and assert `screen.getByRole('heading', { name: /store administration/i })` after rendering children; with `not-admin` assert `getByRole('heading', { name: "You can't open this page" })` and `expect(screen.queryByText('Admin')).toBeNull()` and no 'Products and prices'; with `signed-out` assert `getByRole('heading', { name: 'Sign in to continue' })` and the Sign in link href contains `/admin`.
  - |
    AC4 (Web unit): render `app/admin/products/page.tsx` standalone and assert it renders without importing or calling `getAdminAccess` (`expect(getAdminAccess).not.toHaveBeenCalled()`); render the layout with an admin and assert `getAdminAccess` was called once for the layout plus children.
  - |
    Unit for `getAdminAccess` in apps/web/tests/unit/adminAccess.test.ts with an injected fetch: 200 gives `{status:'admin', email}`, 403 gives `not-admin`, 401 gives `signed-out`, thrown error and 500 give a denial (`status !== 'admin'`); assert the cookie header is forwarded.
  - |
    AC5 (Playwright, apps/web/e2e/admin-access.spec.ts, narrow command `cd apps/web && pnpm exec playwright test e2e/admin-access.spec.ts`): once the shopper sign-in exists, sign in as an admin on the shopper sign-in page, then `await page.goto('/admin')` and `await expect(page.getByRole('heading', { name: 'Store administration' })).toBeVisible()`; plus signed-out `/admin` shows 'Sign in to continue' and a non-admin shopper shows "You can't open this page". Blocked on the open question about the sign-in; if it is not available, ship the API-level AC5 proxy (session from the shopper sign-in resolves to role admin through `resolveSession`) and mark this e2e as pending.
  - |
    Narrow commands: `cd apps/api && pnpm exec vitest run src/routes/admin.test.ts src/app.test.ts` and `cd apps/web && pnpm exec vitest run tests/unit/AdminLayout.test.tsx tests/unit/adminAccess.test.ts`.
assumptions_or_open_questions:
  - |
    BLOCKER / decision needed: no shopper sign-in, session, user or role exists in the repo (searched auth, session, sign-in, jwt, login outside node_modules: no hits; apps/api has only /health, apps/web only the Hero home page). AC5 and "using the shopper sign-in" depend on a sign-in story that is not in this worktree. This plan therefore only adds the guard and a `SessionResolver` seam (default denies everyone) and does NOT build sign-in, users table, passwords or role storage. Please confirm that story lands first, or say if this story must also include a minimal sign-in and a `users.role` column (that would roughly double the size).
  - |
    Assumed the sign-in will expose the role as `'admin' | 'shopper'` on the session; how admins are provisioned (seed, manual SQL) is out of scope here and belongs with the user store.
  - |
    Assumed the admin area lives under `/admin` in the Web App and `/admin/*` in the Shop API; no existing route is changed. The prototype adds no global nav entry, so the top-bar navigation is untouched (there is no navigation in layout.tsx yet either).
  - |
    The Web App's access check is a server-side fetch to the API with the session cookie. If the sign-in story uses a different session mechanism (e.g. Next-only cookie or JWT), only `getAdminAccess` and the default resolver change.
  - |
    Prototype conflicts and shortcuts not carried into code: invented sample products and names (Meera Nair, Arjun Rao) are not shipped; the products page is an empty-state placeholder because product management is another story. The prototype's `data-toast-msg` toasts for sibling areas are replaced by disabled buttons. The signed-out "Sign in" return-to-admin behaviour is the prototype's assumption; the redirect parameter name depends on the sign-in page and is unconfirmed.
  - |
    Design-system loading: whether Next/Tailwind accepts a CSS `@import` of files outside apps/web is unverified; fallback is copying the two files into apps/web/src/styles. Gate max-width reuses `--size-modal`, as the prototype does; no token gaps found.
  - |
    Deferred project questions (audit-log retention from EPIC-009; launch environments, backup and recovery from CHORE-011) do not affect this story: no audit record is written and no schema changes. Not answered here.
  - |
    Admin pages are rendered per request by the layout, so a demoted admin loses access on the next load; client-side navigation between admin pages does not re-check, but every API admin call is still guarded by `requireAdmin`.
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout
  None — no schema, migration or stored data changes; role comes from the (future) sign-in session. One new env var, `API_BASE_URL` (web, server-side only), defaulting to `http://localhost:3000`, documented in apps/web/.env.example. Provisioning: at least one admin user must exist in the sign-in's user store before staff can use the area (created by the sign-in/user story, not here). Order: deploy API before Web; rollback is safe by removing the routes, since the default resolver denies everyone (fails closed).

  Existing-code findings: apps/api/src/app.ts is a 8-line `buildApp()` registering only `healthRoutes`; config.ts has no auth settings; apps/web/src/app/globals.css contains only `@import "tailwindcss";` and layout.tsx has a bare body, so design tokens are not loaded today.

  ```mermaid
  flowchart TD
    Layout[web app/admin/layout.tsx] -->|once per request| Access[web lib/adminAccess.ts]
    Access -->|GET /admin/access + cookie| AdminRoutes[api routes/admin.ts]
    AdminRoutes --> Guard[api auth/requireAdmin.ts]
    Guard --> Resolver[api auth/session.ts SessionResolver]
    App[api app.ts buildApp] --> AdminRoutes
    App --> Health[api routes/health.ts]
    Layout --> Gate[web components/admin/AccessGate.tsx]
    Layout --> Tabs[web components/admin/AdminTabs.tsx]
    Layout --> Pages[web admin/page.tsx and products/page.tsx]
    Globals[web app/globals.css] -->|imports tokens and utils| DS[design-system/tokens.css]
    classDef touched fill:#f96,color:#000
    class Layout,Access,AdminRoutes,Guard,Resolver,App,Gate,Tabs,Pages,Globals touched
  ```
review_focus: |
  IN scope: the admin-role gate (API guard and Web layout), the approved gate/overview/products-placeholder UI, and design-token loading. OUT: building the shopper sign-in, users or role storage, finer roles, and any actual admin features (products, stock, orders). Riskiest area: fail-open behaviour; the default resolver and any API/network error must deny, and the role check must exist only in the API hook plus the one Web layout (child pages deliberately have no check, per AC4). Reviewer should check the plan's central blocker, that no sign-in exists in the repo, is resolved before accepting AC5.
