import Link from "next/link";
import { cookies } from "next/headers";
import { ProductForm } from "@/components/admin/ProductForm";
import { getProduct, listSubCategories } from "@/lib/catalogueApi";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookie = (await cookies()).toString() || null;
  const [product, subCategories] = await Promise.all([getProduct(id, cookie), listSubCategories(cookie)]);
  return (
    <>
      <div className="page-head">
        <div>
          <Link className="btn btn-ghost" href="/admin/products">
            Back to products
          </Link>
          <h1>Edit product</h1>
          <p className="muted">Stock counts and discounts are managed elsewhere.</p>
        </div>
      </div>
      <ProductForm key={product.id} subCategories={subCategories} product={product} />
    </>
  );
}
