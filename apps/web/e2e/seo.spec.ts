import { expect, test } from "@playwright/test";

// Raw HTML via request.get: no scripts run, so this is what a crawler sees.
const pages = [
  { name: "home", url: "/", item: "Classic Cotton Shirt" },
  { name: "categories", url: "/categories", item: "Women" },
  { name: "listing", url: "/products", item: "Floral Summer Dress" },
  { name: "category", url: "/categories/men", item: "Classic Cotton Shirt" },
  { name: "detail", url: "/products/classic-cotton-shirt", item: "Classic Cotton Shirt" },
  { name: "search", url: "/search?q=shirt", item: "Classic Cotton Shirt" },
];

for (const { name, url, item } of pages) {
  test(`${name} page is crawlable in its first HTML response`, async ({ request }) => {
    const res = await request.get(url);
    expect(res.status()).toBe(200);
    expect(res.headers()["x-robots-tag"] ?? "").not.toMatch(/noindex/i);
    const html = await res.text();
    expect(html).toMatch(/<h1[^>]*>[^<]+<\/h1>/);
    expect(html).toContain(item);
    expect(html).toMatch(/<title>[^<]+<\/title>/);
    expect(html).toMatch(/<meta name="description" content="[^"]+"/);
    expect(html).toMatch(/<link rel="canonical" href="https?:\/\/[^"]+"/);
    expect(html).not.toMatch(/noindex/i);
  });
}
