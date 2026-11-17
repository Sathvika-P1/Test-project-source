import { notFound } from "next/navigation";
import { Hero } from "@/components/Hero";
import { ProductGrid } from "@/components/ProductCard";
import { getCategory, getProducts } from "@/lib/catalogue";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

// Render per request so `next build` needs no reachable Shop API.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const category = await getCategory(slug);
  return buildMetadata({
    title: category?.name ?? "Category",
    description: category ? `Shop ${category.name} products.` : "",
    path: `/categories/${slug}`,
  });
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const products = await getProducts({ categorySlug: slug, limit: 48 });
  return (
    <main className="mx-auto max-w-[var(--size-container)] p-[var(--space-3)]">
      <Hero title={category.name} />
      <ProductGrid products={products} />
    </main>
  );
}
