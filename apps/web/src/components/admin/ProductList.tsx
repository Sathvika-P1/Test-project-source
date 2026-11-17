"use client";

import { useState } from "react";
import type { Product } from "@/lib/catalogueApi";
import { ProductRow } from "./ProductRow";

/** Holds the "Removed" toast so it outlives the row that was just removed. */
export function ProductList({ products }: { products: Product[] }) {
  const [removed, setRemoved] = useState<string | null>(null);
  return (
    <>
      <div className="card">
        {products.map((p) => (
          <ProductRow key={p.id} product={p} onRemoved={setRemoved} />
        ))}
      </div>
      {removed && (
        <div className="toast" role="status" data-toast>
          Removed &quot;{removed}&quot;{" "}
          <button type="button" className="btn-ghost btn-sm" onClick={() => setRemoved(null)}>
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
