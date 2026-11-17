"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/catalogueApi";
import { RemoveProductModal } from "./RemoveProductModal";

export function ProductRow({
  product,
  onRemoved,
}: {
  product: Product;
  onRemoved?: (name: string) => void;
}) {
  return (
    <div className="prow">
      <div className="thumb" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.images[0]} alt="" className="thumb-img" />
      </div>
      <div>
        <strong>{product.name}</strong>
        <div className="meta muted">
          <span>{product.brand}</span>
          <span>
            {product.subCategory.topLevel} / {product.subCategory.name}
          </span>
          <span>Sizes: {product.sizes.join(", ")}</span>
        </div>
      </div>
      <div className="acts">
        <strong>{formatPrice(product.price)}</strong>
        <Link
          className="btn btn-secondary"
          href={`/admin/products/${product.id}/edit`}
          aria-label={`Edit ${product.name}`}
        >
          Edit
        </Link>
        <RemoveProductModal product={product} onRemoved={onRemoved} />
      </div>
    </div>
  );
}
