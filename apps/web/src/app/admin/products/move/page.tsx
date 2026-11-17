import { cookies } from "next/headers";
import { MoveProductForm } from "@/components/admin/MoveProductForm";
import { getAdminCategories, getAdminProducts } from "@/lib/catalogApi";

export const dynamic = "force-dynamic";

export default async function MoveProduct() {
  const cookie = (await cookies()).toString() || null;
  const [tops, products] = await Promise.all([getAdminCategories(cookie), getAdminProducts(cookie)]);
  if (!tops || !products) throw new Error("Products didn't load");

  return (
    <>
      <div className="page-head">
        <h1>Move product</h1>
        <p className="muted">Each product is in exactly one sub-category under its top-level category.</p>
      </div>
      <MoveProductForm tops={tops} products={products} />
    </>
  );
}
