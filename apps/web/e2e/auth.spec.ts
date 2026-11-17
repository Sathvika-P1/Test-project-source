import { expect, test } from "@playwright/test";

// Requires the Shop API (with PostgreSQL) reachable through API_URL.
const email = () => `pw-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

test("AC11 signed-out checkout asks for sign-in", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fcheckout/);
  await expect(page.getByText("Sign in to continue to checkout. Your bag is kept.")).toBeVisible();
});

test("AC12/AC4/AC5 register, sign out, and the old session no longer opens account pages", async ({
  page,
  context,
}) => {
  await page.goto("/register");
  await page.getByLabel("Name").fill("Asha Rao");
  await page.getByLabel("Email").fill(email());
  await page.getByLabel("Password").fill("correct-horse");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Your account" })).toBeVisible();

  const before = (await context.cookies()).filter((c) => c.name === "sid");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByText("You are signed out.")).toBeVisible();

  await context.addCookies(before);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("AC6 a wrong password shows the generic error", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email());
  await page.getByLabel("Password").fill("wrong-pass");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText("Email or password is incorrect. Check both and try again.");
});

test("AC8 a shopper is refused store administration", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Name").fill("Asha Rao");
  await page.getByLabel("Email").fill(email());
  await page.getByLabel("Password").fill("correct-horse");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.goto("/admin");
  await expect(page.getByText("You do not have access to store administration.")).toBeVisible();
});
