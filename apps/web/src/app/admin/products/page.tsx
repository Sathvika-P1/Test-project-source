import Link from "next/link";
import { cookies } from "next/headers";
import { ProductList } from "@/components/admin/ProductList";
import { listProducts } from "@/lib/catalogueApi";

export default async function AdminProducts() {
  const cookie = (await cookies()).toString();
  // A failed load throws to error.tsx, which offers Retry.
  const products = await listProducts(cookie || null);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Products</h1>
          <p className="muted">
            Add products and change names, prices and photos. Changes show on the storefront once
            saved.
          </p>
        </div>
        <Link className="btn btn-primary" href="/admin/products/new">
          Add product
        </Link>
      </div>
      {products.length ? (
        <ProductList products={products} />
      ) : (
        <div className="card">
          <div className="empty-state">
            <p>
              <strong>No products yet</strong>
            </p>
            <p className="muted">
              Add your first product so shoppers can find it in its sub-category.
            </p>
            <Link className="btn btn-primary" href="/admin/products/new">
              Add product
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
