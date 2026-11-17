import Link from "next/link";
import { CategoryGrid } from "@/components/CategoryCard";
import { Hero } from "@/components/Hero";
import { ProductGrid } from "@/components/ProductCard";
import { getCategories, getProducts } from "@/lib/catalogue";
import { buildMetadata } from "@/lib/seo";

// Render per request so `next build` needs no reachable Shop API.
export const dynamic = "force-dynamic";

export function generateMetadata() {
  return buildMetadata({
    title: "Fashion, home and beauty",
    description: "Shop featured products and browse categories across fashion, home and beauty.",
    path: "/",
  });
}

export default async function Home() {
  // Failures propagate to error.tsx so a non-200 is returned and never cached.
  const [featured, categories] = await Promise.all([
    getProducts({ featured: true, limit: 8 }),
    getCategories(),
  ]);

  if (featured.length === 0 && categories.length === 0) {
    return (
      <main>
        <Hero title="Shopping Website" />
        <p className="p-[var(--space-3)] text-[color:var(--color-fg)]">
          Nothing to show yet.{" "}
          <Link href="/products" className="underline">
            Shop
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[var(--size-container)] p-[var(--space-3)]">
      <Hero title="Shopping Website" subtitle="Fashion, home and beauty" />
      <section aria-labelledby="featured-heading" className="mb-[var(--space-5)]">
        <h2
          id="featured-heading"
          className="mb-[var(--space-3)] text-[length:var(--font-size-lg)] text-[color:var(--color-fg)]"
        >
          Featured products
        </h2>
        <ProductGrid products={featured} />
      </section>
      <section aria-labelledby="categories-heading">
        <h2
          id="categories-heading"
          className="mb-[var(--space-3)] text-[length:var(--font-size-lg)] text-[color:var(--color-fg)]"
        >
          Shop by category
        </h2>
        <CategoryGrid categories={categories} />
      </section>
    </main>
  );
}
