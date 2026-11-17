import { Hero } from "@/components/Hero";
import { ProductGrid } from "@/components/ProductCard";
import { getProducts } from "@/lib/catalogue";
import { buildMetadata } from "@/lib/seo";

// Render per request so `next build` needs no reachable Shop API.
export const dynamic = "force-dynamic";

export function generateMetadata() {
  return buildMetadata({
    title: "All products",
    description: "Browse every product in the catalogue.",
    path: "/products",
  });
}

export default async function ProductsPage() {
  const products = await getProducts({ limit: 48 });
  return (
    <main className="mx-auto max-w-[var(--size-container)] p-[var(--space-3)]">
      <Hero title="All products" />
      <ProductGrid products={products} />
    </main>
  );
}
