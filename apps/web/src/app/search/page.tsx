import { CategoryGrid } from "@/components/CategoryCard";
import { Hero } from "@/components/Hero";
import { ProductGrid } from "@/components/ProductCard";
import { searchCatalogue } from "@/lib/catalogue";
import { buildMetadata } from "@/lib/seo";

type Props = { searchParams: Promise<{ q?: string | string[] }> };

async function queryOf(searchParams: Props["searchParams"]): Promise<string> {
  const { q } = await searchParams;
  return (Array.isArray(q) ? q[0] : q)?.trim() ?? "";
}

export async function generateMetadata({ searchParams }: Props) {
  const q = await queryOf(searchParams);
  return buildMetadata({
    title: q ? `Search results for ${q}` : "Search",
    description: q ? `Products and categories matching ${q}.` : "Search the catalogue.",
    path: q ? `/search?q=${encodeURIComponent(q)}` : "/search",
  });
}

export default async function SearchPage({ searchParams }: Props) {
  const q = await queryOf(searchParams);
  const results = q ? await searchCatalogue(q) : { products: [], categories: [] };
  const empty = results.products.length === 0 && results.categories.length === 0;
  return (
    <main className="mx-auto max-w-[var(--size-container)] p-[var(--space-3)]">
      <Hero title={q ? `Search results for ${q}` : "Search"} />
      {empty ? (
        <p className="text-[color:var(--color-fg)]">
          {q ? "No matches found." : "Enter a search term."}
        </p>
      ) : (
        <>
          <CategoryGrid categories={results.categories} />
          <ProductGrid products={results.products} />
        </>
      )}
    </main>
  );
}
