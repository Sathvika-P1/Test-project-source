import { CategoryGrid } from "@/components/CategoryCard";
import { Hero } from "@/components/Hero";
import { getCategories } from "@/lib/catalogue";
import { buildMetadata } from "@/lib/seo";

export function generateMetadata() {
  return buildMetadata({
    title: "Shop by category",
    description: "Browse all product categories.",
    path: "/categories",
  });
}

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <main className="mx-auto max-w-[var(--size-container)] p-[var(--space-3)]">
      <Hero title="Shop by category" />
      <CategoryGrid categories={categories} />
    </main>
  );
}
