import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";
import { listPublicProducts, listPublicSubCategories } from "@/lib/catalogueApi";
import "./shop.css";

// Prices and availability change whenever staff save; never serve a stale page.
export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ sub?: string }>;
}) {
  const { sub } = await searchParams;
  const subCategories = await listPublicSubCategories();
  const selected = subCategories.find((s) => s.id === sub) ?? subCategories[0];
  const products = selected ? await listPublicProducts(selected.id) : [];

  return (
    <main className="container page">
      <div className="shop-head">
        <h1>Shop by category</h1>
        <p className="muted">What shoppers see right now.</p>
      </div>
      <div className="shop-chips" role="group" aria-label="Sub-category">
        {subCategories.map((s) => (
          <Link
            key={s.id}
            className="chip"
            href={`/shop?sub=${s.id}`}
            aria-pressed={s.id === selected?.id}
          >
            {s.topLevel} / {s.name}
          </Link>
        ))}
      </div>
      {products.length ? (
        <div className="sfgrid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="muted">No products in this sub-category.</p>
      )}
    </main>
  );
}
