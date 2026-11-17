import Link from "next/link";
import { cookies } from "next/headers";
import { ProductForm } from "@/components/admin/ProductForm";
import { listSubCategories } from "@/lib/catalogueApi";

export default async function NewProduct() {
  const subCategories = await listSubCategories((await cookies()).toString() || null);
  return (
    <>
      <div className="page-head">
        <div>
          <Link className="btn btn-ghost" href="/admin/products">
            Back to products
          </Link>
          <h1>Add product</h1>
          <p className="muted">Stock counts and discounts are managed elsewhere.</p>
        </div>
      </div>
      <ProductForm subCategories={subCategories} />
    </>
  );
}
