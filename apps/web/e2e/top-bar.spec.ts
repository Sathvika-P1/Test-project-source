import { expect, test } from "@playwright/test";

const NAMES = ["Home", "Shop", "Account", "Saved", "Bag"];

test.describe("desktop", () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test("links are inline in order, no Menu button (AC1)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
    const xs: number[] = [];
    for (const name of NAMES) {
      const link = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name });
      await expect(link).toBeVisible();
      xs.push((await link.boundingBox())!.x);
    }
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  test("guest and signed-in see the same items (AC4)", async ({ page, context }) => {
    const read = () =>
      page.getByRole("navigation", { name: "Main" }).getByRole("link").allTextContents();
    await page.goto("/");
    const guest = await read();
    await context.addCookies([{ name: "shopper-session", value: "fake", url: "http://localhost:3000" }]);
    await page.goto("/");
    expect(await read()).toEqual(guest);
    expect(guest).toEqual(NAMES);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("links are hidden behind the Menu button (AC2)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
    for (const name of NAMES) {
      await expect(page.getByRole("link", { name, exact: true })).toBeHidden();
    }
  });

  test("Menu button reveals the links in order (AC3)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    const ys: number[] = [];
    for (const name of NAMES) {
      const link = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name });
      await expect(link).toBeVisible();
      ys.push((await link.boundingBox())!.y);
    }
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
  });
});
