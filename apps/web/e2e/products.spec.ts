import { expect, test } from "@playwright/test";

// A staff session cannot be established yet: sign-in is delivered by a separate story, so the
// browser flow (add -> see on /shop -> re-price -> remove) is skipped until E2E_STAFF_COOKIE is set.
const staffCookie = process.env.E2E_STAFF_COOKIE;

test.describe("staff manage products", () => {
  test.skip(!staffCookie, "No staff session available (set E2E_STAFF_COOKIE to a signed-in admin cookie)");

  test("add, re-price and remove a product", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "sid", value: staffCookie ?? "", url: baseURL ?? "http://localhost:3000" }]);
    await page.goto("/admin/products/new");
    await page.getByLabel("Name").fill("E2E shirt");
    await page.getByLabel("Brand").fill("Harbour");
    await page.getByLabel("Description").fill("Breathable");
    await page.getByLabel("Sub-category").selectOption({ label: "Men / Shirts" });
    await page.getByLabel("Price (₹)").fill("1599");
    await page.getByLabel("M", { exact: true }).check({ force: true });
    await page.getByLabel("Image 1 URL").fill("https://example.test/a.jpg");
    await page.getByRole("button", { name: "Save product" }).click();
    await expect(page.getByText("Saved")).toBeVisible();

    await page.goto("/shop");
    await page.getByRole("link", { name: "Men / Shirts" }).click();
    await expect(page.getByText("E2E shirt")).toBeVisible();

    await page.goto("/admin/products");
    await page.getByRole("link", { name: "Edit E2E shirt" }).click();
    await page.getByLabel("Price (₹)").fill("1799");
    await page.getByRole("button", { name: "Save product" }).click();
    await expect(page.getByText("Saved")).toBeVisible();
    await page.goto("/shop");
    await page.getByRole("link", { name: "Men / Shirts" }).click();
    await expect(page.getByText(/1,799/)).toBeVisible();

    await page.goto("/admin/products");
    await page.getByRole("button", { name: "Remove E2E shirt" }).click();
    await page.getByRole("button", { name: "Remove product" }).click();
    await page.goto("/shop");
    await page.getByRole("link", { name: "Men / Shirts" }).click();
    await expect(page.getByText("E2E shirt")).toHaveCount(0);
  });
});
