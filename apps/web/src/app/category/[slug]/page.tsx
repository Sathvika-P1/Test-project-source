import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryCards } from "@/components/CategoryCards";
import { getShopCategory, getShopTops } from "@/lib/catalogApi";
import "../../catalog.css";

// Read live on every request so a rename or new sub-category shows on the next load.
export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [category, tops] = await Promise.all([getShopCategory(slug), getShopTops()]);
  if (!category) notFound();

  return (
    <div className="container page">
      <div className="page-head">
        <h1>{category.top.name}</h1>
        <p className="muted">Shop by category</p>
      </div>
      <nav className="tops" aria-label="Categories">
        {(tops ?? []).map((t) => (
          <Link
            key={t.slug}
            href={`/category/${t.slug}`}
            className="chip"
            aria-current={t.slug === category.top.slug ? "page" : undefined}
          >
            {t.name}
          </Link>
        ))}
      </nav>
      <CategoryCards top={category.top.name} subcategories={category.subcategories} />
    </div>
  );
}
