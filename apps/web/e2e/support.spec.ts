import { expect, test } from "@playwright/test";

test("support screen shows Back to home and it returns to the home page", async ({ page }) => {
  await page.goto("/support");
  const back = page.getByRole("link", { name: "Back to home" });
  await expect(back).toBeVisible();
  await back.click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Shopping Website" })).toBeVisible();
});
