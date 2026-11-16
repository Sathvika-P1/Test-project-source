summary: |
  Make every stored support request readable by staff next to the order it refers to. The Shop API
  (comp_shop_api, Fastify + PostgreSQL) already stores only requests that passed validation, ownership
  and sign-in (POST /support-requests, table support_requests). This story adds the read side: a
  staff-only endpoint GET /admin/orders/:orderNumber/support-requests returning order number, topic,
  message and shopper for each request on that order (newest first, so two requests on one order are
  both returned), behind a fail-closed StaffSessionResolver dependency. The admin screens themselves
  belong to the Store administration epic and are out of scope; this story delivers the data and
  endpoint those screens will call.
scope:
  - description: |
      Extend the store port with a read method. Add to `SupportRequestStore` in store.ts:
      ```ts
      export interface SupportRequestForStaff extends StoredSupportRequest { createdAt: string }
      listByOrder(orderNumber: string): Promise<SupportRequestForStaff[]>;
      ```
      Implement it in PgSupportRequestStore with a parameterised query:
      `SELECT id, shopper_id, order_number, topic, message, created_at FROM support_requests WHERE order_number = $1 ORDER BY created_at DESC, id DESC`.
      In `defaultDeps()` in deps.ts the default store's `listByOrder` throws
      'no support request store configured', like create, so it stays fail-closed.
    files:
      - apps/api/src/support/store.ts
      - apps/api/src/support/pg-store.ts
      - apps/api/src/support/deps.ts
    rationale: |
      Only rows in support_requests exist, and rows are only inserted after validation, so a failed
      request can never be listed (AC3).
  - description: |
      Add a staff session dependency to deps.ts, mirroring the shopper `SessionResolver`:
      ```ts
      export interface StaffSessionResolver { resolve(req: FastifyRequest): Promise<{ staffId: string } | null> }
      // AppDeps gains: staff: StaffSessionResolver
      // defaultDeps(): staff: { resolve: async () => null }   // fail closed
      ```
    files:
      - apps/api/src/support/deps.ts
    rationale: |
      Support messages are private shopper data; the endpoint must not be open. Real staff sign-in
      belongs to Store administration, so this story only defines the seam, as the shopper session was
      done in the earlier story.
  - description: |
      Add `apps/api/src/routes/admin-support.ts` exporting `adminSupportRoutes(deps: AppDeps)` that
      registers `GET /admin/orders/:orderNumber/support-requests`: 401 `{ error: 'not_signed_in' }`
      when `deps.staff.resolve` is null; otherwise normalise the param with trim().toUpperCase() (same
      as validateSupportRequest) and reply 200 `{ requests: [{ id, orderNumber, topic, message, shopperId, createdAt }] }`
      (empty array when none). Register it in app.ts next to supportRoutes.
    files:
      - apps/api/src/routes/admin-support.ts
      - apps/api/src/app.ts
    rationale: |
      Order number + topic + message + shopper are the fields the scope names; createdAt only orders them.
  - description: |
      Wire the real store in server.ts. No change needed beyond the existing PgSupportRequestStore
      (it now has listByOrder). The staff resolver stays the fail-closed default until Store
      administration supplies one; leave a comment as server.ts already does for sessions.
    files:
      - apps/api/src/server.ts
    rationale: Keeps production wiring consistent; no new env var.
tests:
  - |
    AC1 (write first) in apps/api/src/routes/admin-support.test.ts — request for order 1001 is returned:
    ```ts
    const res = await app.inject({ method: 'GET', url: '/admin/orders/SW-1001/support-requests' });
    expect(res.statusCode).toBe(200);
    expect(res.json().requests).toHaveLength(1);
    expect(res.json().requests[0].orderNumber).toBe('SW-1001');
    ```
    plus lower-case param ` sw-1001 ` is normalised (store.listByOrder called with 'SW-1001'), and
    another order's requests are not returned.
  - |
    AC2 — each item carries order number, topic and message:
    ```ts
    expect(res.json().requests[0]).toMatchObject({ orderNumber: 'SW-1001', topic: 'Other', message: 'Where is it?' });
    ```
  - |
    AC3 — failed validation is never visible: in the same file use the real route stack with an in-memory
    store, POST an invalid body (`message: '  '`, expect 400), then GET and assert
    `expect(res.json().requests).toEqual([])`. Also in pg-store.test.ts assert the query is parameterised
    (`expect(sql).not.toContain('SW-1001'); expect(values).toEqual(['SW-1001'])`).
  - |
    AC4 — two requests on one order are both shown:
    ```ts
    expect(res.json().requests.map((r: { id: string }) => r.id)).toEqual(['2', '1']);
    ```
    and pg-store.test.ts asserts the SQL contains `ORDER BY created_at DESC` and maps rows
    (snake_case to camelCase, id as string).
  - |
    Access control — GET returns 401 with no staff session and with `buildApp()` defaults:
    `expect((await buildApp().inject({ method: 'GET', url: '/admin/orders/SW-1001/support-requests' })).statusCode).toBe(401)`.
    Add an supertest e2e case in apps/api/test/e2e/admin-support.e2e.ts mirroring support.e2e.ts.
assumptions_or_open_questions:
  - |
    Who on the team handles support requests (open from the epic) is not answered by the code. The plan
    uses a generic fail-closed staff session; any signed-in staff member may read all requests. Role
    restrictions are deferred to Store administration and need a human decision.
  - |
    Retention ("How long are requests kept in the admin area?") is unanswered. The plan keeps all rows
    indefinitely and adds no purge; confirm before launch.
  - |
    Storage and delivery: requests are stored in PostgreSQL table support_requests (already built).
    "Delivery to the support team" is satisfied by staff reading them via this endpoint; no email or
    push, consistent with ADR-0006 (no third-party integrations).
  - |
    Admin screens and staff sign-in do not exist in the repo (searched apps/web/src and apps/api/src).
    This story delivers API only; the screen showing requests beside an order is owned by the Store
    administration epic, which will call this endpoint. Acceptance criteria are verified at the API layer.
  - |
    Order numbers in the ACs ("1001") are treated as order_number values as stored; the shopper form
    uses the SW-10482 style. Matching is exact after trim and upper-casing.
  - |
    Launch environments and backup/recovery (project-wide CHORE-011 question) do not change this plan;
    no new infrastructure is required.
estimated_points: 3
package_dependencies: []
notes: |
  ### Data & rollout
  None — no schema change: the support_requests table (apps/api/migrations/001_create_support_requests.sql)
  already holds every field needed, the existing created_at index serves the ordering, and the
  endpoint is read-only. No new settings, seeds or provisioning. Deploy API as usual; roll back by
  reverting the code (nothing stored changes). Note: an index on order_number is not added at the
  current scale (ADR-0004, up to 1,000 daily users); add one if listing becomes slow.

  The web app needs no change (UI is Store administration's), so no design-system work is planned.

  ```mermaid
  flowchart TD
    A[app.ts - registers new route] --> R[routes/admin-support.ts]
    A --> S[routes/support.ts]
    R --> D[support/deps.ts - staff resolver]
    R --> ST[support/store.ts - listByOrder]
    PG[support/pg-store.ts - listByOrder SQL] --> ST
    SV[server.ts - wiring] --> PG
    PG --> T[(support_requests table)]
    classDef touched fill:#f96,color:#000
    class A,R,D,ST,PG,SV touched
  ```
review_focus: |
  IN scope: read-only staff endpoint, store listByOrder, fail-closed staff session seam, API tests. OUT: admin
  UI, staff login/roles, retention, notifications. Riskiest part is access control, since the endpoint exposes
  shopper messages: it must 401 by default. AC3 holds because nothing invalid is ever persisted, so no
  filtering code is added on purpose.
