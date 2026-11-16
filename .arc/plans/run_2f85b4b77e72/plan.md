summary: |
  Show the result of Send on the Customer Support screen itself. `sendSupportRequest` in the web app today collapses every response into `{ sent: boolean }`, and `SupportForm` ignores it (a code comment says confirmation and errors belong to this story). The Shop API (`POST /support-requests`) already answers 201 (stored), 401 `not_signed_in`, 400 `invalid_request` and 422 `order_not_found`, so no API change is needed. The plan (1) widens the web helper to a discriminated result (`sent`, `not_signed_in`, `order_not_found`, `failed`), (2) makes `SupportForm` render the approved prototype's three outcomes: a success `.alert-success` with a summary and a "Send another request" button, a danger `.alert-danger` plus an inline `.field-error` on the order field with everything typed kept, and a warning `.alert-warning` sign-in prompt, and (3) adds the few prototype-local CSS rules the design needs, on existing tokens.

scope:
  - description: |
      Widen the web API helper so the form can tell the outcomes apart. Before → after:

      ```ts
      // before
      export async function sendSupportRequest(input: SupportRequestInput): Promise<{ sent: boolean }>
      // after
      export type SendResult =
        | { status: "sent" }
        | { status: "not_signed_in" }      // HTTP 401
        | { status: "order_not_found" }    // HTTP 422
        | { status: "failed" };            // 400, 5xx, network error
      export async function sendSupportRequest(input: SupportRequestInput): Promise<SendResult>
      ```
    files:
      - apps/web/src/lib/support.ts
    rationale: |
      AC 3 and AC 5 need to distinguish "not your order" from "not signed in"; the API already returns distinct statuses (apps/api/src/routes/support.ts). A network failure or any other status maps to `failed` so the shopper still gets a clear "not sent" error, never a false confirmation.
  - description: |
      Extend `SupportForm` with a result state and keep the field values.

      ```ts
      type Outcome = "idle" | "sent" | "order_not_found" | "not_signed_in" | "failed";
      const [outcome, setOutcome] = useState<Outcome>("idle");
      const [sentValues, setSentValues] = useState<SupportRequestInput | null>(null);
      ```

      - Success (AC 1, 2): replace the form with `.alert.alert-success` (role="status", tabindex -1, focused after send) titled "Request sent", text "Thanks, your request has been received.", and a `<dl>` summary of Order, Topic, Message sent; below it a `.btn.btn-secondary` "Send another request". Pressing it resets the outcome to idle, so the form remounts with its defaults (empty order, topic on the "Choose a topic" placeholder, empty message), and focuses the order field; the route does not change. Because the form is unmounted on success, remount gives the clear for free; verify the topic select returns to the placeholder.
      - Not your order / failed (AC 3, 4): keep the form mounted and render above the fields an `.alert.alert-danger` (role="alert", tabindex -1, focused) titled "Your request was not sent". For `order_not_found` the text is "<order> is not one of your orders. Use one of your own order numbers, then send again. Everything you typed is still here." and the order input gets `is-invalid`, `aria-invalid` and a `.field-error` (with the alert icon, id `support-order-err` added to `aria-describedby`) reading "We can’t find <order> in your orders. Check the number in your order confirmation email." For `failed` use "Something went wrong on our side. Try sending again in a moment." with no field error. Fields are uncontrolled refs and stay mounted, so typed values persist.
      - Signed out (AC 5): `.alert.alert-warning` (role="alert", focused) titled "Sign in to send your request", text "You are not signed in, so nothing was sent. What you typed is kept here.", plus a `.btn.btn-primary` "Sign in" link. The form stays with values kept.
      - Clear any previous outcome when Send is pressed again; empty-field validation from story 016 is unchanged (no request, no result alert).
      - Capture the trimmed submitted values in `sentValues` before the call, for the success summary.
      - Remove the stale comment "confirmation and errors belong to the next story".
    files:
      - apps/web/src/components/SupportForm.tsx
    rationale: |
      Reuses the existing SupportForm component (no new component, matching the prototype's "NEW: none"). Matches prototype elements `success-alert`, `new-request` button, `live-alert` (danger) and `c-alert` (warning with Sign in). Per the UI guidelines a problem that needs action is an `.alert`, not a `.toast`; the form error sits in `.field-error` with `.is-invalid`; one `.btn-primary` per region (Send request in the form, Sign in only when signed out, see open questions); others `.btn-secondary`. Copy follows the voice rules.
  - description: |
      Add the prototype-local rules for the new markup to the existing support block, tokens only. `.alert-*`, `.alert-title`, `.field-error`, `.is-invalid`, `.btn-*`, `.stack` are already defined in design-system/prototype-utils.css, which globals.css imports (lines 2-3), so no new import is needed. `.icon` has no rule in design-system, so size it here (the existing back-link svg already uses it). Add:

      ```css
      .support .field-error { display: flex; gap: var(--space-1); align-items: flex-start; }
      .support .field-error .icon { flex: none; margin-top: var(--space-1); }
      .support .alert { margin-bottom: var(--space-1); }
      .support .alert .btn { margin-top: var(--space-2); }
      .support dl { display: grid; grid-template-columns: max-content 1fr; gap: var(--space-1) var(--space-3); margin: var(--space-2) 0 0; }
      .support dt { color: var(--color-fg-muted); }
      .support dd { margin: 0; overflow-wrap: anywhere; }
      .support .alert:focus { outline: var(--border-width) solid var(--color-fg); outline-offset: var(--space-1); }
      .support .icon { width: var(--size-icon); height: var(--size-icon); }
      ```
    files:
      - apps/web/src/app/globals.css
    rationale: |
      These are the rules the approved prototype adds in its own style block for the result states (prototype lines 953-954 for the field-error rules). Tokens used: --space-1, --space-2, --space-3, --size-icon, --border-width, --color-fg, --color-fg-muted. Implementer: confirm each token exists in design-system/tokens.css; if one does not, use the nearest existing token and note it.
  - description: |
      Update the unit tests (written first) and add e2e coverage. Unit: the existing default mock `{ sent: true }` becomes `{ status: "sent" }`; mock per case with the new `SendResult`; add a helper-mapping test file. E2E (Playwright, stubbing `/api/support-requests` with `page.route`): success then Send another request, 422 keeps values, 401 shows the sign-in prompt.
    files:
      - apps/web/tests/unit/SupportForm.test.tsx
      - apps/web/tests/unit/support-lib.test.ts
      - apps/web/e2e/support.spec.ts
    rationale: |
      Test-first coverage for AC 1-5 at unit and browser level; the API side is already covered by apps/api/src/routes/support.test.ts and its e2e.

tests:
  - |
    AC1 (write first; fails today because nothing is rendered) in apps/web/tests/unit/SupportForm.test.tsx:

    ```ts
    it("shows a confirmation on the same screen when the send succeeds", async () => {
      vi.mocked(supportLib.sendSupportRequest).mockResolvedValueOnce({ status: "sent" });
      render(<SupportForm />);
      fill(filled);
      send();
      expect(await screen.findByText("Request sent")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("your request has been received");
      expect(screen.getByRole("heading", { name: "Customer support" })).toBeInTheDocument();
    });
    ```
  - |
    AC2 same file:

    ```ts
    it("clears the form and stays on the screen after Send another request", async () => {
      vi.mocked(supportLib.sendSupportRequest).mockResolvedValueOnce({ status: "sent" });
      render(<SupportForm />);
      fill(filled);
      send();
      fireEvent.click(await screen.findByRole("button", { name: "Send another request" }));
      expect(screen.queryByText("Request sent")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Order number")).toHaveValue("");
      expect(screen.getByLabelText("Topic")).toHaveValue("");
      expect(screen.getByLabelText("Message")).toHaveValue("");
      expect(screen.getByRole("heading", { name: "Customer support" })).toBeInTheDocument();
    });
    ```
  - |
    AC3 same file (plus a `failed` case asserting the same "Your request was not sent" title and no "Request sent"):

    ```ts
    it("shows an inline not-sent error when the order is not the shopper's", async () => {
      vi.mocked(supportLib.sendSupportRequest).mockResolvedValueOnce({ status: "order_not_found" });
      render(<SupportForm />);
      fill({ ...filled, order: "SW-10099" });
      send();
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Your request was not sent");
      expect(screen.getByLabelText("Order number")).toHaveAttribute("aria-invalid", "true");
      expect(screen.queryByText("Request sent")).not.toBeInTheDocument();
    });
    ```
  - |
    AC4 same file:

    ```ts
    it("keeps the typed topic, order number and message after an error", async () => {
      vi.mocked(supportLib.sendSupportRequest).mockResolvedValueOnce({ status: "order_not_found" });
      render(<SupportForm />);
      fill({ ...filled, order: "SW-10099" });
      send();
      await screen.findByRole("alert");
      expect(screen.getByLabelText("Order number")).toHaveValue("SW-10099");
      expect(screen.getByLabelText("Topic")).toHaveValue("Wrong or damaged item");
      expect(screen.getByLabelText("Message")).toHaveValue("The mug arrived chipped.");
    });
    ```
  - |
    AC5 same file:

    ```ts
    it("prompts a signed-out shopper to sign in and keeps what they typed", async () => {
      vi.mocked(supportLib.sendSupportRequest).mockResolvedValueOnce({ status: "not_signed_in" });
      render(<SupportForm />);
      fill(filled);
      send();
      expect(await screen.findByText("Sign in to send your request")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
      expect(screen.queryByText("Request sent")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Message")).toHaveValue("The mug arrived chipped.");
    });
    ```
  - |
    Helper mapping, new file apps/web/tests/unit/support-lib.test.ts, stubbing `globalThis.fetch`:

    ```ts
    it.each([[201, "sent"], [401, "not_signed_in"], [422, "order_not_found"], [400, "failed"], [500, "failed"]])(
      "maps HTTP %i to %s", async (code, status) => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: code }));
        expect(await sendSupportRequest(input)).toEqual({ status });
      });
    it("maps a network error to failed", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
      expect(await sendSupportRequest(input)).toEqual({ status: "failed" });
    });
    ```
  - |
    Playwright in apps/web/e2e/support.spec.ts (AC 1-5 in the browser):

    ```ts
    await page.route("**/api/support-requests", (r) =>
      r.fulfill({ status: 422, json: { error: "order_not_found" } }));
    // fill the three fields, click "Send request"
    await expect(page.getByRole("alert")).toContainText("Your request was not sent");
    await expect(page.getByLabel("Order number")).toHaveValue("SW-10099");
    ```

    Repeat with 201 (expect "Request sent", click "Send another request", expect empty fields and `await expect(page).toHaveURL(/\/support$/)`) and 401 (expect "Sign in to send your request"). Keep the existing Back to home test.

assumptions_or_open_questions:
  - |
    Sign-in destination is not known. The item says only that a prompt to sign in is shown; the prototype's Sign in button just shows a toast, and apps/web/src/app holds only page.tsx, layout.tsx and support/page.tsx (no sign-in route). The plan renders Sign in as a link to a single constant (proposed `SIGN_IN_HREF = "/sign-in"`) in SupportForm.tsx. Please confirm the real path, or whether the prompt should be text only until the sign-in story lands. The prototype's toast is a prototype shortcut and is not carried into production.
  - |
    The prototype shows a "Signed in as <email>" line and the success text "We will reply to <email>". The web app has no session/profile data and the API's 201 returns only `{ id }`, so both are left out; success copy is "Thanks, your request has been received." Say if the email should be shown (it needs the API to return it or a session endpoint).
  - |
    The prototype's own-orders sample data (SW-10482 etc.) is not carried over. Ownership is decided by the API (422 order_not_found), which gives the same answer for a missing and another shopper's order, so the inline error says "We can’t find <order> in your orders" and never claims who owns it.
  - |
    The prototype also shows a field-level summary alert for several empty fields after Send. That is story 016's validation, unchanged here, so it is not touched. The form fields themselves and the admin view are out of scope per the item.
  - |
    Real sign-in is not wired in the web app or the API's default deps, so end to end today every Send may return 401 until a session resolver is configured by another story. Unit and Playwright tests stub the response.
  - |
    Deferred project-wide questions (who handles support requests in the admin area; launch environments and backup and recovery) do not affect this web-only story and are not answered here.

estimated_points: 3

package_dependencies: []

notes: |
  ### Data & rollout
  None — web UI and a client helper only; no schema, stored data, settings or env vars change. The API contract (201/401/400/422) is unchanged and already deployed, so the web change ships on its own and rolls back by reverting.

  ### Design and tokens
  Read the approved prototype (SHOPPING-WEBSITE-STORY-017-design.html): `success-alert` (alert-success, role=status), `new-request` (btn-secondary), `live-alert` (alert-danger, role=alert) with `.field-error` carrying an alert icon, and `c-alert` (alert-warning) with a Sign in button. Tokens and utility classes already load: apps/web/src/app/globals.css line 2 imports design-system/tokens.css and line 3 imports design-system/prototype-utils.css, which define `.alert`, `.alert-success/-warning/-danger`, `.alert-title`, `.field-error`, `.is-invalid`, `.btn-primary/-secondary`, `.stack`. The only new CSS is the prototype-local block in scope, on tokens, with no hex or px literals. Component reused: SupportForm; nothing new.

  ### Shape
  ```mermaid
  flowchart TD
    Page[app/support/page.tsx] --> Form[SupportForm.tsx]
    Form -->|reads result status| Lib[lib/support.ts sendSupportRequest]
    Lib -->|POST /api/support-requests| Route[api routes/support.ts]
    Form --> CSS[globals.css support block]
    Route -->|201 / 401 / 400 / 422| Lib
    classDef touched fill:#f96,color:#000
    class Form,Lib,CSS touched
  ```
  SupportForm (new result states), lib/support.ts (status-aware result) and globals.css (alert and summary rules) are touched; the page and the API route are unchanged context.

review_focus: |
  IN: web-only — `sendSupportRequest` result type, SupportForm's success / not-your-order / signed-out states, and the matching CSS. OUT: form fields, 016 validation, admin view, API changes, the real sign-in flow. Riskiest part is keeping typed values on error (fields are uncontrolled refs and must stay mounted) and fully clearing them on Send another request, including the topic select back to its placeholder. Deliberate: failures other than 401/422 show the same "not sent" error rather than a confirmation, and the prototype's email line and toast are intentionally omitted.
