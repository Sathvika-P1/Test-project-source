// Minimal in-memory Shop API used by the e2e run so it needs no PostgreSQL.
import { createServer } from "node:http";

const categories = [
  { id: 1, slug: "men", name: "Men", parentId: null, sortOrder: 1 },
  { id: 2, slug: "women", name: "Women", parentId: null, sortOrder: 2 },
];
const products = [
  {
    id: 1,
    slug: "classic-cotton-shirt",
    name: "Classic Cotton Shirt",
    brand: "Roadster",
    description: "A breathable cotton shirt.",
    priceCents: 129900,
    currency: "INR",
    imageUrl: null,
    categoryId: 1,
    featured: true,
  },
  {
    id: 2,
    slug: "floral-summer-dress",
    name: "Floral Summer Dress",
    brand: "Libas",
    description: "Light floral dress.",
    priceCents: 179900,
    currency: "INR",
    imageUrl: null,
    categoryId: 2,
    featured: true,
  },
];

const send = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "categories" && parts.length === 1) return send(res, 200, categories);
  if (parts[0] === "categories") {
    const c = categories.find((x) => x.slug === parts[1]);
    return c ? send(res, 200, c) : send(res, 404, { error: "Not found" });
  }
  if (parts[0] === "products" && parts.length === 1) {
    const slug = url.searchParams.get("category");
    const featured = url.searchParams.get("featured");
    return send(
      res,
      200,
      products.filter(
        (p) =>
          (!slug || categories.find((c) => c.id === p.categoryId)?.slug === slug) &&
          (featured === null || String(p.featured) === featured),
      ),
    );
  }
  if (parts[0] === "products") {
    const p = products.find((x) => x.slug === parts[1]);
    return p ? send(res, 200, p) : send(res, 404, { error: "Not found" });
  }
  if (parts[0] === "search") {
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    return send(res, 200, {
      products: products.filter((p) => p.name.toLowerCase().includes(q)),
      categories: categories.filter((c) => c.name.toLowerCase().includes(q)),
    });
  }
  if (parts[0] === "health") return send(res, 200, { status: "ok" });
  send(res, 404, { error: "Not found" });
}).listen(Number(process.env.FAKE_API_PORT ?? 3101));
