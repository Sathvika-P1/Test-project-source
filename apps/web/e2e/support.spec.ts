import { expect, test } from "@playwright/test";

test("support screen shows Back to home and it returns to the home page", async ({ page }) => {
  await page.goto("/support");
  const back = page.getByRole("link", { name: "Back to home" });
  await expect(back).toBeVisible();
  await back.click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Shopping Website" })).toBeVisible();
});

const typed = { order: "SW-10099", message: "The mug arrived chipped." };

async function fillAndSend(page: import("@playwright/test").Page) {
  await page.goto("/support");
  await page.getByLabel("Order number").fill(typed.order);
  await page.getByLabel("Topic").selectOption("Wrong or damaged item");
  await page.getByLabel("Message").fill(typed.message);
  await page.getByRole("button", { name: "Send request" }).click();
}

test("a sent request shows a confirmation and Send another request clears the form", async ({ page }) => {
  await page.route("**/api/support-requests", (r) => r.fulfill({ status: 201, json: { id: "1" } }));
  await fillAndSend(page);
  await expect(page.getByRole("status")).toContainText("Request sent");
  await page.getByRole("button", { name: "Send another request" }).click();
  await expect(page.getByLabel("Order number")).toHaveValue("");
  await expect(page.getByLabel("Topic")).toHaveValue("");
  await expect(page.getByLabel("Message")).toHaveValue("");
  await expect(page).toHaveURL(/\/support$/);
});

test("an order that is not the shopper's shows an error and keeps what was typed", async ({ page }) => {
  await page.route("**/api/support-requests", (r) =>
    r.fulfill({ status: 422, json: { error: "order_not_found" } }),
  );
  await fillAndSend(page);
  await expect(page.getByRole("alert")).toContainText("Your request was not sent");
  await expect(page.getByLabel("Order number")).toHaveValue(typed.order);
  await expect(page.getByLabel("Topic")).toHaveValue("Wrong or damaged item");
  await expect(page.getByLabel("Message")).toHaveValue(typed.message);
});

test("a signed-out shopper is prompted to sign in", async ({ page }) => {
  await page.route("**/api/support-requests", (r) =>
    r.fulfill({ status: 401, json: { error: "not_signed_in" } }),
  );
  await fillAndSend(page);
  await expect(page.getByRole("alert")).toContainText("Sign in to send your request");
});
