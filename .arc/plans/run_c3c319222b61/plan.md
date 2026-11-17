summary: |
  Add email-and-password accounts end to end. The Shop API (Fastify, PostgreSQL via pg) gets a `users`, `sessions` and `login_attempts` schema, registration / sign-in / sign-out / current-user endpoints backed by server-side sessions in an HttpOnly cookie, a per-email lockout (5 failed attempts, 15 minutes), an `admin` role guard, and owner-scoped read endpoints for the shopper's bag, Saved items and orders so that AC 9/10 (data belongs to the shopper) can be proven. The Web App (Next.js + Tailwind v4 + design-system tokens) gets the approved Register, Sign in and Account screens, the project top-bar shell, a server-side session guard for account pages, a sign-in-required guard for checkout, and a store-administration page that is shown to admins and refused to everyone else. Work is test-first: an API unit/inject test, a web component/unit test, then supertest/Playwright coverage per acceptance criterion.
scope:
  - description: |
      Load the design system once in the web app. `apps/web/src/app/globals.css` currently holds only `@import "tailwindcss";` (apps/web/src/app/globals.css:1) and layout.tsx imports it (apps/web/src/app/layout.tsx:2), so no token is loaded today. Add imports of `design-system/tokens.css` (the `--color-*`, `--space-*`, `--radius-*`, `--size-*`, `--font-*` custom properties) and `design-system/prototype-utils.css` (defines `.btn`, `.btn-primary/-secondary/-ghost`, `.btn-sm`, `.card`, `.card-title`, `.field`, `.field-hint`, `.field-error`, `.input`, `.input.is-invalid`, `.alert`, `.alert-info/-success/-warning/-danger`, `.alert-title`, `.badge`, `.badge-neutral/-success`, `.empty-state`, `.stack`, `.stack-lg`, `.cluster`, `.grid`, `.container`, `.text-muted`) from `globals.css`, using a relative path from `apps/web/src/app` (four levels up to the repo root). Then add the classes the approved prototype defines only in its own inline style, rewritten on the same tokens, in a new `apps/web/src/app/auth.css` imported from `globals.css`: `.auth-header`, `.auth-brand`, `.auth-links`, `.auth-main`, `.auth-card` (max-width 26rem, centred), `.acct-head`, `.acct-list`, `.admin-area`, and the shell classes `.shell`, `.shell-header`, `.shell-bar`, `.shell-brand`, `.shell-nav`, `.shell-nav-group`, `.shell-main`, `.shell-footer`, `.shell-menu-btn` with the 48rem breakpoint (nav inline at 48rem and above, collapsed behind the Menu button below). Tokens used: --space-1..6, --border-width, --color-border, --color-bg, --color-bg-subtle, --color-fg, --color-fg-muted, --color-primary, --color-border-strong, --radius-md, --font-size-lg/-xl/-sm, --font-weight-bold/-medium, --line-height-tight. No hex/px literals; the only non-token values are the prototype's own 26rem and 48rem breakpoint (see open questions).
    files:
      - apps/web/src/app/globals.css
      - apps/web/src/app/auth.css
    rationale: |
      The tokens are not loaded yet; the classes the prototype uses come from design-system/prototype-utils.css or from its inline style, so they must be imported or defined once, on tokens.

  - description: |
      API schema and data access. Add `apps/api/migrations/001_accounts.sql` creating:
      `users(id uuid pk, name text not null, email text not null, password_hash text not null, role text not null default 'shopper' check (role in ('shopper','admin')), created_at timestamptz not null default now())` with a unique index on `email` (stored trimmed + lowercased);
      `sessions(token_hash text pk, user_id uuid not null references users(id) on delete cascade, expires_at timestamptz not null, created_at timestamptz not null default now())`;
      `login_attempts(email text pk, failed_count int not null default 0, locked_until timestamptz)` (keyed by email, not user id, so an unregistered email behaves identically and nothing reveals which emails exist);
      owner-scoped read models `bag_items(id, user_id fk, name, quantity)`, `saved_items(id, user_id fk, name)`, `orders(id, user_id fk, number, status)` — minimal tables only so that "bag, Saved and orders belong to the shopper" (AC 9/10) is real and testable; richer product/checkout columns are for the stories that own those features. Add `apps/api/src/db/pool.ts` (a `pg.Pool` built from `loadConfig().databaseUrl`) and `apps/api/src/db/migrate.ts` (applies the `migrations/*.sql` files in name order inside a transaction, recording applied names in `schema_migrations`; idempotent). Add script `"migrate": "tsx src/db/migrate.ts"` to apps/api/package.json.
    files:
      - apps/api/migrations/001_accounts.sql
      - apps/api/src/db/pool.ts
      - apps/api/src/db/migrate.ts
      - apps/api/package.json
    rationale: |
      No schema, migration runner or persistence exists yet (apps/api/src holds only app.ts, config.ts, server.ts, routes/health.ts). The repo already depends on `pg`; no new package is needed.

  - description: |
      Auth domain in the API, written test-first against an `AuthStore` interface so unit tests run with an in-memory store and no database (the project's unit command `pnpm run test` has no database).
      ```ts
      // apps/api/src/auth/store.ts
      export type Role = 'shopper' | 'admin';
      export interface User { id: string; name: string; email: string; passwordHash: string; role: Role }
      export interface AuthStore {
        createUser(u: { name: string; email: string; passwordHash: string }): Promise<User | null>; // null when the email exists
        findUserByEmail(email: string): Promise<User | null>;
        createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
        findSession(tokenHash: string, now: Date): Promise<User | null>; // null when unknown or expired
        deleteSession(tokenHash: string): Promise<void>;
        getAttempts(email: string): Promise<{ failedCount: number; lockedUntil: Date | null }>;
        recordFailure(email: string, now: Date): Promise<void>; // increments; sets lockedUntil = now + 15 min on the 5th
        clearAttempts(email: string): Promise<void>;
        accountSummary(userId: string): Promise<{ bag: {name:string;quantity:number}[]; saved: {name:string}[]; orders: {number:string;status:string}[] }>;
      }
      ```
      Files: `password.ts` (`hashPassword` / `verifyPassword` with `node:crypto` scrypt + random salt + `timingSafeEqual`; no new package), `validation.ts` (`validateRegistration({name,email,password})` returning per-field errors: empty name -> "Enter your name."; empty or malformed email -> "Enter an email address in the form name@example.com."; password under 8 characters -> "Password must be at least 8 characters."; email trimmed and lowercased before storage and lookup), `service.ts` (`register`, `signIn`, `signOut`, `currentUser`), `memory-store.ts` and `pg-store.ts` (the pg one uses the pool and `INSERT ... ON CONFLICT (email) DO NOTHING`), `cookies.ts` (parse the `Cookie` header and build `Set-Cookie` by hand, no `@fastify/cookie` dependency: cookie `sid`, `HttpOnly; SameSite=Lax; Path=/; Max-Age=<ttl>`, plus `Secure` when `NODE_ENV=production`). Session token = 32 random bytes (base64url); only its SHA-256 is stored; sign-out deletes the row so the old cookie stops working (AC 5). Sign-in rules: unknown email and wrong password both run a scrypt verify (dummy hash for unknown email) and return the identical 401 `{ message: "Email or password is incorrect. Check both and try again." }`; `getAttempts` is checked first and a locked email returns 429 `{ message: "Too many failed attempts. Try again in 15 minutes." }` even when the password is correct (AC 19); a success calls `clearAttempts`; the clock is injected (`now: () => Date`) so AC 20 is tested without waiting. Registration of an existing email returns 409 `{ message: "We could not create an account with these details. Try different details or sign in." }`; success returns 201 with the user (never the hash), starts a session and sets the cookie (AC 12). No email verification step (AC 2).
    files:
      - apps/api/src/auth/store.ts
      - apps/api/src/auth/password.ts
      - apps/api/src/auth/validation.ts
      - apps/api/src/auth/service.ts
      - apps/api/src/auth/memory-store.ts
      - apps/api/src/auth/pg-store.ts
      - apps/api/src/auth/cookies.ts
    rationale: |
      Keeps rules (lockout, generic errors, validation) in one pure, injectable layer, with the database behind an interface so the unit suite stays hermetic.

  - description: |
      HTTP routes and guards, wired into `buildApp`. Change `buildApp(): FastifyInstance` (apps/api/src/app.ts:4) to `buildApp(deps: Partial<{ store: AuthStore; now: () => Date; config: Config }> = {}): FastifyInstance`, defaulting to the in-memory store so the existing `buildApp()` health test keeps passing; `apps/api/src/server.ts` passes the pg store and closes the pool on shutdown. Routes: `POST /auth/register`, `POST /auth/sign-in`, `POST /auth/sign-out` (204, clears cookie, idempotent), `GET /auth/me` (200 user or 401), `GET /account/summary` (requires a session; returns only that user's bag / saved / orders), `GET /admin/status` (requires admin; 401 without a session, 403 `{ message: "You do not have access to store administration." }` for a non-admin, 200 `{ area: "store-administration" }` for admin). A `requireUser` / `requireAdmin` preHandler lives in `apps/api/src/auth/guards.ts`. Add config fields `sessionTtlSeconds` (env `SESSION_TTL_SECONDS`, default 604800), `lockoutMaxAttempts` (default 5) and `lockoutSeconds` (default 900) to `loadConfig` in apps/api/src/config.ts. Admin accounts are never created through registration (always `shopper`); an operator promotes one with `UPDATE users SET role='admin' WHERE email=...` (documented in notes).
    files:
      - apps/api/src/app.ts
      - apps/api/src/server.ts
      - apps/api/src/config.ts
      - apps/api/src/auth/guards.ts
      - apps/api/src/routes/auth.ts
      - apps/api/src/routes/account.ts
      - apps/api/src/routes/admin.ts
    rationale: |
      Exposes the domain over the existing Fastify app and enforces authentication and the admin role on the server, not just in the UI.

  - description: |
      Web: API client and session guard. Add `apps/web/next.config.ts` rewrites so browser calls to `/api/:path*` go to `process.env.API_URL` (default `http://localhost:3000`), keeping the session cookie same-origin. Add `apps/web/src/lib/session.ts` with `getCurrentUser(): Promise<{ id; name; email; role } | null>` that, in a server component, forwards the incoming `sid` cookie to `GET /auth/me` (no caching, `cache: 'no-store'`) and `requireUser(next: string)` that `redirect()`s to `/sign-in?next=<next>` when null. Because the check hits the API on every request, a signed-out cookie is rejected (AC 5), not merely absent. Add `apps/web/src/lib/api.ts` with typed `registerAccount`, `signIn`, `signOut` fetch helpers (credentials same-origin) returning `{ ok, message?, fieldErrors? }`.
    files:
      - apps/web/next.config.ts
      - apps/web/src/lib/session.ts
      - apps/web/src/lib/api.ts
    rationale: |
      Next.js server-rendered pages need the session validated server-side on each request; rewrites avoid cross-origin cookie handling.

  - description: |
      Web: Register screen at `/register` (prototype screen "Register"; no shell, page uses `.auth-header` with the brand "Shopping Website", a ghost `Shop` button and a `.btn-secondary` "Sign in" link, then `.auth-main` > `form.card.auth-card.stack`). Client component `RegisterForm` in `apps/web/src/components/RegisterForm.tsx`: h1 "Create your account", `.text-muted` line "Use your name, email and a password of at least 8 characters.", three `.field`s — Name (`autocomplete="name"`), Email (`type="email"`, `autocomplete="email"`), Password (`type="password"`, `autocomplete="new-password"`, `.field-hint` "At least 8 characters.") — one `.btn.btn-primary` "Create account", and "Already have an account?" + `.btn-ghost.btn-sm` "Sign in" link. Error state (prototype state "error"): `.alert.alert-danger role="alert"` titled "Fix N things to continue" with "Your details are kept below.", each failing control gets `.is-invalid`, `aria-invalid="true"`, `aria-describedby` pointing at its `.field-error` text (messages as in the API validation list); entered values are kept. Client-side checks mirror the API; the API is the authority. Existing-email state ("exists"): `.alert.alert-danger` "We could not create an account with these details. Try different details or sign in." Success: on 201 router-navigate to `/account`, where the prototype's "signed-in" state is a `.alert.alert-success role="status"` "Welcome, <name>" / "You are signed in." Submit button is disabled with a button-sized `.spinner` while the request is in flight (guidelines: spinner only for button-sized waits).
    files:
      - apps/web/src/app/register/page.tsx
      - apps/web/src/components/RegisterForm.tsx
      - apps/web/src/components/AuthHeader.tsx
    rationale: |
      Builds the approved Register design (states default, error, exists, signed-in) against the real endpoint.

  - description: |
      Web: Sign-in screen at `/sign-in` (prototype screen "Sign in"). `SignInForm` client component in `apps/web/src/components/SignInForm.tsx`: h1 "Sign in", Email and Password fields (`autocomplete="email"` / `current-password`), `.btn-primary` "Sign in", and "New here?" + ghost "Create an account". Generic error state: `.alert.alert-danger role="alert"` with id referenced by both inputs' `aria-describedby`, text "Email or password is incorrect. Check both and try again.", both inputs `.is-invalid` (the UI never says which was wrong, AC 6). Locked state (HTTP 429): `.alert.alert-warning role="alert"` with `.alert-title` "Too many failed attempts" and "Try again in 15 minutes.", submit button `disabled`. Checkout variant: when the page is opened with `?next=/checkout`, show `.alert.alert-info` "Sign in to continue to checkout. Your bag is kept." above the form. On success navigate to the validated `next` (same-origin relative paths only; otherwise `/account`).
    files:
      - apps/web/src/app/sign-in/page.tsx
      - apps/web/src/components/SignInForm.tsx
    rationale: |
      Builds the approved Sign in design with its default, checkout, error and locked states.

  - description: |
      Web: project shell and Account screen. `apps/web/src/components/SiteShell.tsx` renders the top bar from design-system/app-shell.html and the prototype's shell: brand "Shopping Website" linking home, `Home` (`data-nav-key="home"`), `Shop` (`shop`), then `Account` (`account`), `Saved` (`wishlist`), `Bag` (`cart`) inside `nav#main-nav`, a "Menu" `.btn-secondary.btn-sm.shell-menu-btn` toggling it below 48rem (`aria-controls`, `aria-expanded`), `aria-current="page"` on the active link, and the `.shell-footer`. It wraps account and admin pages through a route-group layout `apps/web/src/app/(shell)/layout.tsx` (home page `apps/web/src/app/page.tsx` is left as is). Account page `apps/web/src/app/(shell)/account/page.tsx` (server component): `requireUser('/account')`, then `GET /account/summary`; renders `.acct-head` with h1 "Your account" and a `.btn-secondary` "Sign out" (`SignOutButton` client component posts `/api/auth/sign-out` then goes to `/account`, which now renders the signed-out state), `.text-muted` "Signed in as <name> (<email>)", and a `.grid` of three `.card` sections "Bag (n)", "Saved (n)", "Orders (n)" with `.acct-list` rows (orders show a `.badge.badge-success` status). Signed-out state of the Account route is the prototype's "signed-out" state: `.alert.alert-success role="status"` "You are signed out." plus `.empty-state` "Sign in to view your account" / "Your bag, Saved items and orders are shown after you sign in." with `.btn-primary` "Sign in" and `.btn-secondary` "Create account" — shown only after an explicit sign-out (`?signed-out=1`); an unauthenticated direct visit redirects to `/sign-in?next=/account` (AC 5 either way requires sign-in). Empty lists use the guideline `.empty-state` with a Shop action.
    files:
      - apps/web/src/components/SiteShell.tsx
      - apps/web/src/components/SignOutButton.tsx
      - apps/web/src/app/(shell)/layout.tsx
      - apps/web/src/app/(shell)/account/page.tsx
    rationale: |
      Delivers the approved Account screen and the product's initial top-bar navigation that UI-GUIDELINES.md says this set introduces; keeps the shell in step with design-system/app-shell.html.

  - description: |
      Web: store administration and checkout guard. `apps/web/src/app/(shell)/admin/page.tsx` (server component) calls `GET /admin/status` with the forwarded cookie: no session -> redirect to `/sign-in?next=/admin`; 200 -> prototype "admin" state (h1 "Store administration", `.badge.badge-neutral` "Admin", `.text-muted` "Signed in as <name> (admin).", `.admin-area` "Store administration is open to this account.", ghost/secondary "Back to account"); 403 -> prototype "refused" state (`.alert.alert-danger role="alert"` titled "You do not have access to store administration." with "This account does not have the admin role." and "Back to account"). The account page links to `/admin` ("Open store administration"), shown only as a plain link for every signed-in user so the 403 path is reachable. `apps/web/src/app/(shell)/checkout/page.tsx` is a minimal guarded entry: `requireUser('/checkout')` and, when signed in, a placeholder heading "Checkout" (the checkout story owns the content). `apps/web/src/middleware.ts` is NOT used for authorisation (a cookie-presence check cannot see a revoked session).
    files:
      - apps/web/src/app/(shell)/admin/page.tsx
      - apps/web/src/app/(shell)/checkout/page.tsx
    rationale: |
      AC 7/8 need admin and refused outcomes decided by the API; AC 11 needs a checkout entry that demands sign-in.

  - description: |
      Tests (written first for each task above; listed under `tests`). API unit/inject tests live beside the code (`apps/api/src/**/*.test.ts`, vitest, Fastify `app.inject`, in-memory store, injected clock); supertest integration tests against a real PostgreSQL in `apps/api/test/e2e/auth.e2e.ts` (run by `pnpm run e2e`, config apps/api/vitest.e2e.config.ts, mirroring test/e2e/health.e2e.ts); web unit tests in `apps/web/tests/unit/*.test.tsx` (vitest + Testing Library, mirroring tests/unit/Hero.test.tsx); Playwright flow `apps/web/e2e/auth.spec.ts` (mirroring e2e/home.spec.ts).
    files:
      - apps/api/src/auth/validation.test.ts
      - apps/api/src/auth/password.test.ts
      - apps/api/src/auth/service.test.ts
      - apps/api/src/routes/auth.test.ts
      - apps/api/src/routes/account.test.ts
      - apps/api/src/routes/admin.test.ts
      - apps/api/test/e2e/auth.e2e.ts
      - apps/web/tests/unit/RegisterForm.test.tsx
      - apps/web/tests/unit/SignInForm.test.tsx
      - apps/web/tests/unit/SiteShell.test.tsx
      - apps/web/e2e/auth.spec.ts
    rationale: |
      TDD at each layer; one failing test per acceptance criterion first.
tests:
  - |
    AC1 (apps/api/src/routes/auth.test.ts) — write first, fails until register + sign-in exist:
    ```ts
    const app = buildApp({ store: new MemoryAuthStore() });
    const reg = await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Asha Rao', email: 'asha@example.com', password: 'correct-horse' } });
    expect(reg.statusCode).toBe(201);
    const login = await app.inject({ method: 'POST', url: '/auth/sign-in', payload: { email: 'asha@example.com', password: 'correct-horse' } });
    expect(login.statusCode).toBe(200);
    ```
  - |
    AC2 (routes/auth.test.ts) — no verification step: register, then sign in immediately; `expect(login.statusCode).toBe(200)` and the user row has no `verified` field (`expect(Object.keys(reg.json().user)).toEqual(['id','name','email','role'])`).
  - |
    AC3 (routes/auth.test.ts + web/tests/unit/SignInForm.test.tsx) — sign-in sets the cookie and `GET /auth/me` shows the user:
    ```ts
    const cookie = login.headers['set-cookie'] as string;
    expect(cookie).toMatch(/^sid=.+; .*HttpOnly/);
    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: cookie.split(';')[0] } });
    expect(me.json().user.email).toBe('asha@example.com');
    ```
  - |
    AC4 (routes/auth.test.ts + web SiteShell/Account test) — sign-out clears the session:
    ```ts
    const out = await app.inject({ method: 'POST', url: '/auth/sign-out', headers: { cookie: sid } });
    expect(out.statusCode).toBe(204);
    expect(out.headers['set-cookie']).toMatch(/Max-Age=0/);
    ```
    Web: after clicking "Sign out" the Account route shows `screen.getByText('You are signed out.')`.
  - |
    AC5 (routes/auth.test.ts, plus Playwright auth.spec.ts) — the pre-sign-out session is rejected:
    ```ts
    await app.inject({ method: 'POST', url: '/auth/sign-out', headers: { cookie: sid } });
    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: sid } });
    expect(me.statusCode).toBe(401);
    const acct = await app.inject({ method: 'GET', url: '/account/summary', headers: { cookie: sid } });
    expect(acct.statusCode).toBe(401);
    ```
    Playwright: replay the old `sid` cookie, `await page.goto('/account'); await expect(page).toHaveURL(/\/sign-in/)`.
  - |
    AC6 (routes/auth.test.ts + SignInForm.test.tsx) — identical response for unknown email and wrong password:
    ```ts
    const unknown = await app.inject({ method: 'POST', url: '/auth/sign-in', payload: { email: 'nobody@example.com', password: 'whatever-1' } });
    const wrong = await app.inject({ method: 'POST', url: '/auth/sign-in', payload: { email: 'asha@example.com', password: 'wrong-pass' } });
    expect(unknown.statusCode).toBe(401);
    expect(wrong.statusCode).toBe(401);
    expect(unknown.json()).toEqual(wrong.json());
    expect(wrong.json().message).toBe('Email or password is incorrect. Check both and try again.');
    ```
    Web: `expect(screen.getByRole('alert')).toHaveTextContent('Email or password is incorrect.')` and the text does not match /email is|password is wrong/i.
  - |
    AC7 (routes/admin.test.ts + admin page) — admin sees administration:
    ```ts
    store.setRole('priya@example.com', 'admin');
    const res = await app.inject({ method: 'GET', url: '/admin/status', headers: { cookie: adminSid } });
    expect(res.statusCode).toBe(200);
    ```
  - |
    AC8 (routes/admin.test.ts) — non-admin is refused, signed-out is 401:
    ```ts
    const res = await app.inject({ method: 'GET', url: '/admin/status', headers: { cookie: shopperSid } });
    expect(res.statusCode).toBe(403);
    expect(res.json().message).toBe('You do not have access to store administration.');
    ```
    A registered account never receives `role: 'admin'` from `/auth/register` even with `payload.role = 'admin'` (`expect(reg.json().user.role).toBe('shopper')`).
  - |
    AC9 (routes/account.test.ts and test/e2e/auth.e2e.ts against PostgreSQL) — data survives sign-out / sign-in:
    ```ts
    const before = (await app.inject({ method: 'GET', url: '/account/summary', headers: { cookie: sidA1 } })).json();
    await app.inject({ method: 'POST', url: '/auth/sign-out', headers: { cookie: sidA1 } });
    const sidA2 = await signIn(app, 'a@example.com', 'password-a');
    const after = (await app.inject({ method: 'GET', url: '/account/summary', headers: { cookie: sidA2 } })).json();
    expect(after).toEqual(before);
    expect(after.bag.length).toBeGreaterThan(0);
    ```
  - |
    AC10 (routes/account.test.ts) — shopper B sees none of A's data:
    ```ts
    const b = (await app.inject({ method: 'GET', url: '/account/summary', headers: { cookie: sidB } })).json();
    expect(b).toEqual({ bag: [], saved: [], orders: [] });
    ```
  - |
    AC11 (Playwright apps/web/e2e/auth.spec.ts + a unit test for `requireUser`) — signed-out checkout redirects:
    ```ts
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcheckout/);
    await expect(page.getByText('Sign in to continue to checkout. Your bag is kept.')).toBeVisible();
    ```
    Unit: `requireUser('/checkout')` with `getCurrentUser` mocked to null calls `redirect('/sign-in?next=%2Fcheckout')`.
  - |
    AC12 (routes/auth.test.ts + RegisterForm.test.tsx) — registration signs the shopper in immediately:
    ```ts
    expect(reg.statusCode).toBe(201);
    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: (reg.headers['set-cookie'] as string).split(';')[0] } });
    expect(me.statusCode).toBe(200);
    ```
  - |
    AC13 (routes/auth.test.ts + RegisterForm.test.tsx) — duplicate email gets the generic refusal, same for different case:
    ```ts
    const dup = await app.inject({ method: 'POST', url: '/auth/register', payload: { name: 'Other', email: 'ASHA@example.com', password: 'another-pass' } });
    expect(dup.statusCode).toBe(409);
    expect(dup.json().message).toBe('We could not create an account with these details. Try different details or sign in.');
    expect(dup.json().message).not.toMatch(/registered|exists|already/i);
    ```
  - |
    AC14 (validation.test.ts, it.each) — any empty field is refused, with per-field messages:
    ```ts
    it.each([['name'], ['email'], ['password']])('refuses empty %s', (field) => {
      const input = { name: 'Asha', email: 'asha@example.com', password: 'correct-horse', [field]: '' };
      expect(validateRegistration(input)[field]).toBeDefined();
    });
    ```
    plus a route test asserting 400 and no user created; web test asserts the "Fix 3 things to continue" alert and `aria-invalid="true"` on each field.
  - |
    AC15 (validation.test.ts) — 7 characters refused:
    ```ts
    expect(validateRegistration({ name: 'A', email: 'a@example.com', password: '1234567' }).password).toBe('Password must be at least 8 characters.');
    ```
  - |
    AC16 (validation.test.ts + routes/auth.test.ts) — boundary of exactly 8 characters accepted:
    ```ts
    expect(validateRegistration({ name: 'A', email: 'a@example.com', password: '12345678' })).toEqual({});
    expect((await register(app, 'a@example.com', '12345678')).statusCode).toBe(201);
    ```
  - |
    AC17 (validation.test.ts, it.each) — malformed emails refused:
    ```ts
    it.each(['asha@example', 'asha.example.com', '@example.com', 'a b@example.com'])('refuses %s', (email) => {
      expect(validateRegistration({ name: 'A', email, password: 'correct-horse' }).email).toBe('Enter an email address in the form name@example.com.');
    });
    ```
  - |
    AC18 (services/service.test.ts with injected clock) — 4 failures then the correct password succeeds:
    ```ts
    for (let i = 0; i < 4; i++) await signInWith('asha@example.com', 'wrong-pass');
    expect((await signInWith('asha@example.com', 'correct-horse')).statusCode).toBe(200);
    ```
  - |
    AC19 (service.test.ts) — 5 failures lock the account even for the correct password, and the unregistered-email path locks identically:
    ```ts
    for (let i = 0; i < 5; i++) await signInWith('asha@example.com', 'wrong-pass');
    const res = await signInWith('asha@example.com', 'correct-horse');
    expect(res.statusCode).toBe(429);
    expect(res.json().message).toBe('Too many failed attempts. Try again in 15 minutes.');
    ```
    Web: on 429 the SignInForm shows the warning alert and `expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()`.
  - |
    AC20 (service.test.ts) — lock lifts after 15 minutes (injected clock, boundary checked on both sides):
    ```ts
    clock.advance(14 * 60_000 + 59_000);
    expect((await signInWith('asha@example.com', 'correct-horse')).statusCode).toBe(429);
    clock.advance(1_000);
    expect((await signInWith('asha@example.com', 'correct-horse')).statusCode).toBe(200);
    ```
  - |
    Supporting tests — password.test.ts: `expect(await verifyPassword('correct-horse', await hashPassword('correct-horse'))).toBe(true)` and a different password returns false; the stored hash never equals the plaintext. Migration/data test (test/e2e/auth.e2e.ts): after `migrate()` runs twice (idempotent) and on a database that already holds rows in `schema_migrations`, `/health` still returns 200 and a pre-inserted `users` row (inserted before the second migrate) can still sign in. Web SiteShell.test.tsx: the nav lists Home, Shop, Account, Saved, Bag in that order with `data-nav-key` home/shop/account/wishlist/cart and visible copy never contains "Cart" or "Wishlist".
assumptions_or_open_questions:
  - |
    Rate limit (deferred question): the story's own ACs fix it — lock after 5 failed attempts, lock lasts 15 minutes (AC 18-20) — so the plan uses 5 and 15 minutes as defaults (`lockoutMaxAttempts`, `lockoutSeconds` in config). Counted per email, and counters reset on a successful sign-in. Per-IP limiting is NOT planned.
  - |
    Session lifetime (open project-wide question from SHOPPING-WEBSITE-EPIC-006): not answered anywhere I could read. Assumed 7 days (`SESSION_TTL_SECONDS=604800`), fixed expiry (not sliding), configurable. Please confirm or give a different value.
  - |
    Launch environments and backup/recovery (SHOPPING-WEBSITE-CHORE-011): not answerable from the code or ADRs (ADR-0005 says hosting is open). The plan needs only `DATABASE_URL`, `API_URL` and `NODE_ENV=production` for the Secure cookie; migration is run with `pnpm run migrate` before the new API code starts.
  - |
    Bag, Saved and orders do not exist yet in this codebase (apps/api/src has only the health route). AC 9/10 and the Account screen require them to belong to a shopper, so this plan adds only minimal owner-keyed tables and a read-only `GET /account/summary`. The features that add and remove bag/Saved items and place orders belong to other stories and must write to these tables (or extend them). If those stories already define their own schema, the tables here should be dropped and the summary endpoint should read theirs — please confirm. Tests seed these rows directly.
  - |
    Checkout does not exist yet. AC 11 is met with a guarded `/checkout` entry page and a sign-in redirect that preserves `next`. "Your bag is kept" in the design's checkout banner is only true once a bag exists; a signed-out visitor's bag (cookie/local) is outside this story, so the banner text is shown as designed but carrying the bag across sign-in is for the bag story.
  - |
    Prototype vs ACs: the prototype Account screen has two demo buttons ("Open store administration" and "Open store administration as shopper") that switch states client-side. Production has one "Open store administration" link; the outcome (admin vs refused) comes from the API role, per AC 7/8. The prototype "Shop" and brand links toast "outside this story" — in production they are plain links to `/shop` and `/`, which may not exist yet (home exists; `/shop` is another story).
  - |
    Admin role provisioning is not specified. Registration always creates `shopper`; the first admin is promoted by an operator with SQL (or a future admin story). No seed script is planned. Please confirm that is acceptable.
  - |
    Only password length >= 8 is a rule from the ACs. I additionally cap passwords at 128 characters to bound scrypt cost; this is a deliberate extra, easy to drop.
  - |
    Design-system CSS is imported from outside `apps/web` via a relative path (`../../../../design-system/...`). If Next.js/Tailwind refuses imports outside the app root, the fallback is to copy tokens.css and prototype-utils.css into `apps/web/src/styles/` with a sync note; I did not run the build to confirm. The 26rem auth-card width and 48rem breakpoint are taken from the prototype / UI guidelines, not from tokens (no token covers them).
  - |
    Hero (apps/web/src/components/Hero.tsx) is the only existing component and is not applicable to these screens, so new components (RegisterForm, SignInForm, SiteShell, AuthHeader, SignOutButton) are required.
estimated_points: 8
package_dependencies: []
notes: |
  ### Data & rollout

  - **Existing data**: The API has no schema or persisted data today (apps/api/src has only app.ts, config.ts, server.ts and a health route), so `001_accounts.sql` only creates new tables; no existing row is altered. Unique index on `users.email` and the role CHECK apply to an empty table.
  - **Backfill / seed**: None needed. The migration runner (`apps/api/src/db/migrate.ts`) records applied files in `schema_migrations` and is idempotent / safe to re-run. No admin is seeded; an operator promotes one with `UPDATE users SET role = 'admin' WHERE email = '<lowercased email>';`.
  - **Settings**: `SESSION_TTL_SECONDS` (default 604800), optional `LOCKOUT_MAX_ATTEMPTS` (default 5) and `LOCKOUT_SECONDS` (default 900) read in apps/api/src/config.ts; web `API_URL` (default `http://localhost:3000`) read in apps/web/next.config.ts. All are safe when unset. Document them in a short comment block in config.ts and next.config.ts (no .env file is read or written).
  - **Provisioning**: A PostgreSQL database reachable at `DATABASE_URL` (already a config field). Nothing else (no third-party integration, ADR-0006).
  - **Order and rollback**: Deploy order: run `pnpm run migrate` in apps/api, then deploy the API, then the web app (which calls the new endpoints). Rollback: redeploy the previous web/API; the new tables are unused by old code and can stay. A down step is `DROP TABLE sessions, login_attempts, bag_items, saved_items, orders, users, schema_migrations` (data loss, only for a full revert).

  ### Approach
  - Server-side sessions in an HttpOnly, SameSite=Lax cookie (opaque token, SHA-256 stored) instead of JWTs, so sign-out truly revokes the session (AC 5) and no secret key needs provisioning.
  - Password hashing with `node:crypto` scrypt: no new dependency, so `package_dependencies` is empty. Cookies are hand-parsed for the same reason.
  - Anti-enumeration: identical 401 for unknown email vs wrong password (with a dummy hash verify to even out timing), lockout counters keyed by email text so unregistered emails lock too, and a generic 409 on duplicate registration.
  - Authorisation is enforced by the API on every request; Next.js pages only reflect it. Middleware is deliberately not used for auth.
  - Web follows UI-GUIDELINES.md: `.btn-primary` once per screen region, `.alert` for problems that need action, `.field`/`.field-error`/`.is-invalid` for form errors, sentence case, "Bag"/"Saved" copy only, errors say what to do next.

  ```mermaid
  flowchart TD
    classDef touched fill:#f96,color:#000
    server[apps/api/src/server.ts]:::touched
    app[apps/api/src/app.ts]:::touched
    config[apps/api/src/config.ts]:::touched
    health[routes/health.ts]
    authroutes[routes/auth.ts, account.ts, admin.ts]:::touched
    service[auth/service.ts]:::touched
    store[auth/store.ts, pg-store.ts, memory-store.ts]:::touched
    pg[(PostgreSQL via pg)]
    pages[web register, sign-in, account, admin, checkout pages]:::touched
    session[web lib/session.ts + api.ts]:::touched
    css[web globals.css + auth.css]:::touched
    ds[design-system tokens.css + prototype-utils.css]
    server -->|passes pg store| app
    app --> health
    app -->|registers new routes| authroutes
    app -->|reads limits and TTL| config
    authroutes --> service
    service --> store
    store --> pg
    pages -->|forward sid cookie| session
    session -->|/api rewrite to Shop API| authroutes
    pages --> css
    css -->|import tokens and utilities| ds
  ```
review_focus: |
  IN scope: email+password register / sign-in / sign-out, server-side sessions, generic errors, 5-attempt/15-minute per-email lockout, admin role guard, sign-in at checkout, and the approved Register / Sign in / Account / admin-refused screens. OUT: password reset, profile, addresses, email verification, and the real bag / Saved / order / checkout features (only minimal owner-keyed tables, a read-only summary endpoint and a guarded /checkout stub exist so AC 9-11 can be proven). Riskiest areas: the lockout boundary (exactly 5 failures, exactly 15 minutes, counter reset on success), anti-enumeration consistency between unknown-email and wrong-password paths, and session revocation on sign-out. Deliberate choices: no new npm packages (scrypt + manual cookie parsing), authorisation by the API on every request rather than Next middleware, and `buildApp()` defaulting to an in-memory store for tests while server.ts supplies the pg store.
