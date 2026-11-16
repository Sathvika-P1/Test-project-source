import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/catalogue";

export function formatPrice(priceCents: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(priceCents / 100);
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <li
      data-testid="product-card"
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-[var(--space-3)]"
    >
      <Link href={`/products/${product.slug}`} className="flex flex-col gap-[var(--space-2)]">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt="" width={220} height={220} unoptimized />
        ) : null}
        <span className="text-[length:var(--font-size-md)] text-[color:var(--color-fg)]">
          {product.name}
        </span>
        <span className="text-[length:var(--font-size-sm)] text-[color:var(--color-fg-muted)]">
          {product.brand}
        </span>
        <span className="text-[length:var(--font-size-sm)] text-[color:var(--color-fg)]">
          {formatPrice(product.priceCents, product.currency)}
        </span>
      </Link>
    </li>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(var(--size-grid-min),1fr))] gap-[var(--space-3)]">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </ul>
  );
}
