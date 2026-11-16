summary: |
  Make the five catalogue pages (Home, category, listing, product detail, search results) server-rendered Next.js (App Router) pages whose initial HTML already contains the page heading and the catalogue items, a non-empty title, a meta description, a canonical URL, and no noindex directive. The catalogue data comes from the Shop API (Fastify + PostgreSQL), which today only has /health, so the plan adds read-only catalogue endpoints (categories, products, product by slug, search) with a migration and seed, a typed server-side fetch client in the web app, one shared SEO metadata helper used by every page's generateMetadata, and caching (Next fetch revalidation + Cache-Control on the API) to keep the pages fast. Tests are written first: API route tests (supertest/inject), vitest unit tests for the SEO helper and server components, and a Playwright spec that fetches raw HTML with JavaScript disabled and asserts all five ACs per page.
scope:
  - description: |
      Load design tokens once in the web app's entry stylesheet. apps/web/src/app/globals.css currently only has `@import "tailwindcss";` (line 1), so no token is loaded today. Add `@import "../../../../design-system/tokens.css";` after it. All new UI styles only with these tokens via Tailwind arbitrary values, e.g. `text-[length:var(--font-size-xl)]`, `text-[color:var(--color-fg)]`, `p-[var(--space-3)]`, `rounded-[var(--radius-md)]`, `border-[var(--color-border)]`, `gap-[var(--space-3)]`, `max-w-[var(--size-container)]`. Do not import design-system/prototype-utils.css (prototype-only) and do not use its class names.
    files:
      - apps/web/src/app/globals.css
    rationale: |
      The design system must be loaded before any UI step can use token names; layout.tsx already imports globals.css so this is the single place.
  - description: |
      API: catalogue schema, migration and seed. Create SQL migration `apps/api/migrations/001_catalogue.sql` with tables `categories(id, slug UNIQUE, name, parent_id NULL, sort_order)` and `products(id, slug UNIQUE, name, brand, description, price_cents, currency, image_url, category_id REFERENCES categories, featured boolean default false, created_at)`, plus indexes on category_id, featured and a `to_tsvector` GIN index for name/brand/description. Add an idempotent seed `apps/api/seeds/catalogue.sql` (INSERT ... ON CONFLICT (slug) DO NOTHING) with the top-level categories (Men, Women, Kids, Home, Beauty, GenZ, Studio), the Shop-by-category cards (Ethnic Wear, Casual Wear, Men's Activewear, Women's Activewear, Western Wear, Sportswear, apparel, watch, skincare, fragrance/makeup) and a few products per category, some featured. Add a small runner `apps/api/src/db/migrate.ts` (applies the SQL files in order, tracks them in a `schema_migrations` table) and a `migrate` script in apps/api/package.json.
    files:
      - apps/api/migrations/001_catalogue.sql
      - apps/api/seeds/catalogue.sql
      - apps/api/src/db/migrate.ts
      - apps/api/package.json
    rationale: |
      No catalogue storage exists yet (apps/api only has routes/health.ts); the pages cannot list real items without it. pg is already a dependency.
  - description: |
      API: repository + routes. Add `apps/api/src/catalogue/repository.ts` exporting
      ```ts
      export interface CatalogueRepository {
        listCategories(): Promise<Category[]>;
        getCategory(slug: string): Promise<Category | null>;
        listProducts(opts: { categorySlug?: string; featured?: boolean; limit: number; offset: number }): Promise<Product[]>;
        getProduct(slug: string): Promise<Product | null>;
        search(q: string, limit: number): Promise<{ products: Product[]; categories: Category[] }>;
      }
      export function createPgRepository(pool: Pool): CatalogueRepository;
      ```
      and `apps/api/src/routes/catalogue.ts` registering GET /categories, /categories/:slug, /products (query category, featured, limit, offset), /products/:slug (404 when absent) and /search (query q, matches product name/brand/description and category name). All send `Cache-Control: public, max-age=60, stale-while-revalidate=300`. Change `buildApp()` to `buildApp(deps: { catalogue?: CatalogueRepository } = {})` and register the catalogue routes when a repository is given; server.ts builds a pg Pool from loadConfig().databaseUrl and passes createPgRepository(pool). Existing `buildApp()` call in app.test.ts keeps working.
    files:
      - apps/api/src/catalogue/repository.ts
      - apps/api/src/catalogue/types.ts
      - apps/api/src/routes/catalogue.ts
      - apps/api/src/app.ts
      - apps/api/src/server.ts
    rationale: |
      Dependency-injected repository lets route tests use an in-memory fake (no database) while production uses PostgreSQL, following the existing buildApp()/inject test style.
  - description: |
      Web: server-side catalogue client and SEO helper. Create `apps/web/src/lib/catalogue.ts` with typed functions `getCategories()`, `getCategory(slug)`, `getProducts(opts)`, `getProduct(slug)`, `searchCatalogue(q)` that call `${process.env.SHOP_API_URL}` using `fetch(url, { next: { revalidate: 60 } })` (search uses `cache: "no-store"` because queries are unbounded). Create `apps/web/src/lib/seo.ts`:
      ```ts
      export function buildMetadata(input: { title: string; description: string; path: string }): Metadata
      // returns { title, description, alternates: { canonical: path }, robots: { index: true, follow: true } }
      ```
      with a fallback description when the input is empty so title and description are never empty. In layout.tsx set `metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000")` so canonical resolves to an absolute URL; keep the root title as a title template default. Never emit `noindex` anywhere (no robots noindex, no X-Robots-Tag header) on these pages.
    files:
      - apps/web/src/lib/catalogue.ts
      - apps/web/src/lib/seo.ts
      - apps/web/src/app/layout.tsx
    rationale: |
      One helper guarantees ACs 2-5 for every page the same way; Next.js generateMetadata renders title, description, canonical and robots into the server HTML head.
  - description: |
      Web: five server-component pages, each an async Server Component that awaits catalogue data and renders the h1 and the items in the HTML (no "use client", no useEffect data loading), each exporting `generateMetadata` that calls buildMetadata. Routes (assumed, see open questions): Home `/` (extend apps/web/src/app/page.tsx: reuse Hero with the existing title prop for the h1, then featured products and Shop-by-category cards; empty catalogue shows the empty message with a link to Shop; fetch failure renders the error message with a Try again link back to `/`), Category `/categories` (top-level categories and Shop-by-category cards) , Listing `/products` and `/categories/[slug]` (products, optionally filtered by category), Product detail `/products/[slug]` (h1 = product name, brand, price, description; `notFound()` when absent), Search `/search?q=` (h1 "Search results for ..." and matching products and categories; canonical is `/search` with the q param). Shared presentational pieces `apps/web/src/components/ProductCard.tsx` and `CategoryCard.tsx` render a link plus name, styled only with the tokens above. Extend Hero (apps/web/src/components/Hero.tsx) rather than adding a new hero; do not change its current `title` prop contract (tests/unit/Hero.test.tsx).
    files:
      - apps/web/src/app/page.tsx
      - apps/web/src/app/categories/page.tsx
      - apps/web/src/app/categories/[slug]/page.tsx
      - apps/web/src/app/products/page.tsx
      - apps/web/src/app/products/[slug]/page.tsx
      - apps/web/src/app/search/page.tsx
      - apps/web/src/components/ProductCard.tsx
      - apps/web/src/components/CategoryCard.tsx
      - apps/web/src/components/Hero.tsx
    rationale: |
      Server components put the heading and items in the first HTML response (AC1). Hero is the existing component and is reused.
  - description: |
      Caching and rendering strategy (answers the deferred question). Home, category, listing and product detail use incremental static regeneration through fetch `revalidate: 60` (served from the Next cache, regenerated in the background) so the HTML is cheap to serve; search is dynamically rendered per request but the API response carries Cache-Control for shared caches. Images use next/image with explicit width/height; no client JS is needed to show catalogue content, so the HTML is complete before scripts run. Document SHOP_API_URL (default http://localhost:3001) and SITE_URL in `apps/web/.env.example`, and set the API port via PORT=3001 in `apps/api/.env.example` because both components default to port 3000 (api config.ts, playwright baseURL).
    files:
      - apps/web/.env.example
      - apps/api/.env.example
    rationale: |
      Keeps pages fast without a measurable target being set yet; the target itself is an open question.
tests:
  - |
    AC1 (API data, write first) apps/api/src/routes/catalogue.test.ts using an in-memory fake repository:
    ```ts
    const app = buildApp({ catalogue: fakeRepo });
    const res = await app.inject({ method: 'GET', url: '/products?featured=true&limit=8&offset=0' });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBeGreaterThan(0);
    expect(res.headers['cache-control']).toContain('max-age=60');
    expect((await app.inject({ method: 'GET', url: '/products/nope' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/search?q=shirt' })).json().products[0].name).toMatch(/shirt/i);
    ```
    Plus a migration/seed test (apps/api/src/db/migrate.test.ts) that running the seed twice leaves the row count unchanged.
  - |
    AC1 (unit, apps/web/tests/unit/pages.test.tsx) render each async page with a mocked lib/catalogue and assert the heading and items are in the output:
    ```tsx
    const ui = await Home();
    render(ui);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByTestId("product-card").length).toBe(2);
    ```
    and the same for categories, products, products/[slug] and search; plus the empty-catalogue message with a Shop link and the error state with a Try again link to "/".
  - |
    AC2-AC5 (unit, apps/web/tests/unit/seo.test.ts):
    ```ts
    const m = buildMetadata({ title: "Men", description: "Shop men", path: "/categories/men" });
    expect(m.title).toBe("Men");
    expect(m.description).toBeTruthy();
    expect(m.alternates?.canonical).toBe("/categories/men");
    expect(m.robots).toEqual({ index: true, follow: true });
    expect(buildMetadata({ title: "x", description: "", path: "/" }).description).not.toBe("");
    ```
  - |
    AC1-AC5 end to end (apps/web/e2e/seo.spec.ts) fetch raw HTML with `request.get` (no script execution) for `/`, `/categories`, `/products`, `/products/<seeded-slug>`, `/search?q=<seeded-term>` and assert for each:
    ```ts
    const html = await (await request.get(url)).text();
    expect(html).toMatch(/<h1[^>]*>[^<]+<\/h1>/);
    expect(html).toContain(expectedItemName);
    expect(html).toMatch(/<title>[^<]+<\/title>/);
    expect(html).toMatch(/<meta name="description" content="[^"]+"/);
    expect(html).toMatch(/<link rel="canonical" href="https?:\/\/[^"]+"/);
    expect(html).not.toMatch(/noindex/i);
    ```
    Also assert the response has no `x-robots-tag` header containing noindex. Update the existing e2e/home.spec.ts only if the h1 text changes.
assumptions_or_open_questions:
  - |
    Measurable load-time target (project-wide, deferred): not set. This plan makes pages server-rendered and cached but adds no performance threshold test; a target (for example LCP on a mobile connection) needs a human decision before one can be asserted.
  - |
    Launch environments and backup and recovery expectations (project-wide, deferred): not answered here. ADR-0005 leaves hosting open and ADR-0007 says availability is best effort, so the plan only introduces the SHOP_API_URL and SITE_URL settings and nothing environment-specific.
  - |
    The catalogue data (tables, endpoints, seed) does not exist yet and the sibling stories (home, category, listing, detail, search) may own it. This plan includes a minimal read-only version so the pages are real rather than fixture-driven; if those stories land first or own the data, drop the API scope items and reuse their endpoints. Reviewer to decide whether to split.
  - |
    Route layout is assumed: Home /, category /categories and /categories/[slug], listing /products, detail /products/[slug], search /search?q=. Filters and sort on the listing are out of scope here (only server rendering and SEO of the page).
  - |
    Canonical for search results is assumed to be /search?q=... (self-referencing, indexable) because AC5 forbids noindex; paginated and filtered listing canonicals point at the unfiltered listing path.
  - |
    The Myntra screenshot category names are taken from the parent epic text; no image assets are available, so cards and products render with a text name and an optional image_url.
estimated_points: 8
package_dependencies: []
notes: |
  ### Data & rollout

  - **Existing data**: new tables only (categories, products); no existing rows are altered.
  - **Backfill / seed**: apps/api/seeds/catalogue.sql seeds the catalogue and is idempotent (ON CONFLICT (slug) DO NOTHING); safe to re-run. The migration runner records applied files in schema_migrations so it is also re-runnable.
  - **Settings**: web SHOP_API_URL (default http://localhost:3001 for local use) and SITE_URL (default http://localhost:3000, used for absolute canonical URLs) documented in apps/web/.env.example; api PORT and DATABASE_URL already exist in apps/api/src/config.ts, documented in apps/api/.env.example. In production SITE_URL must be set to the public origin or canonicals will point at localhost.
  - **Provisioning**: a PostgreSQL database reachable via DATABASE_URL, with `pnpm run migrate` and the seed run before the API serves catalogue routes.
  - **Order and rollback**: migrate, then seed, then deploy API, then web. Rollback: the new tables are additive, so leaving them in place is safe; drop categories and products to fully revert.

  ### Findings

  - Web is Next.js 15 App Router with Tailwind 4 (apps/web/src/app/globals.css line 1 imports tailwindcss); today only `/` exists, rendering Hero. Design tokens (design-system/tokens.css, e.g. --color-fg, --space-3, --radius-md, --size-container) are not loaded yet; the first scope item loads them.
  - Existing test setup: vitest jsdom for apps/web/tests/unit, Playwright e2e running `pnpm build && pnpm start` on port 3000; API uses vitest with app.inject.
  - Narrow test commands: `(cd apps/api && pnpm exec vitest run src/routes/catalogue.test.ts)`, `(cd apps/web && pnpm exec vitest run tests/unit/seo.test.ts)`, `(cd apps/web && pnpm exec playwright test e2e/seo.spec.ts)`.
  - The Playwright run needs the API and a seeded database available; the e2e webServer config must also start the API (or the spec must stub SHOP_API_URL with a small fake server) — implementer should pick the fake server so e2e does not need Postgres.

  ```mermaid
  flowchart TD
    Browser --> Pages[web app pages]
    Pages --> Seo[lib/seo.ts]
    Pages --> Client[lib/catalogue.ts]
    Pages --> Hero[components/Hero.tsx]
    Pages --> Layout[app/layout.tsx]
    Layout --> Css[app/globals.css]
    Client --> Routes[api routes/catalogue.ts]
    Routes --> Repo[api catalogue/repository.ts]
    App[api app.ts] --> Routes
    App --> Health[routes/health.ts]
    Repo --> PG[(PostgreSQL)]
    classDef touched fill:#f96,color:#000
    class Pages,Seo,Client,Hero,Layout,Css,Routes,Repo,App touched
  ```
review_focus: |
  IN scope: server-rendered HTML for the five catalogue pages with heading, items, title, meta description, canonical and no noindex, plus the minimal read-only catalogue API and seed they need. OUT: listing filters/sort, cart, a performance threshold (target undecided), deployment. Riskiest areas: canonical URLs depending on SITE_URL (wrong in production if unset) and the catalogue API/schema possibly overlapping sibling stories. Server components deliberately do all data loading; no client-side fetching is expected.
