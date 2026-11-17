import type { Product } from "@/lib/catalogueApi";
import { formatPrice } from "@/lib/format";

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="card stack">
      <div className="sfimg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.images[0]} alt={product.name} />
      </div>
      <strong>{product.name}</strong>
      <span className="muted">
        {product.brand}, sizes {product.sizes.join(", ")}
      </span>
      <strong>{formatPrice(product.price)}</strong>
    </div>
  );
}
