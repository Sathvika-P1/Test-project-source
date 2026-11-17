import { cookies } from "next/headers";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { getAdminCategories } from "@/lib/catalogApi";

export const dynamic = "force-dynamic";

// Access is decided once by the admin layout; the Shop API re-checks on every call.
export default async function AdminCategories() {
  const tops = await getAdminCategories((await cookies()).toString() || null);
  if (!tops) throw new Error("Sub-categories didn't load");

  return (
    <>
      <div className="page-head">
        <h1>Categories</h1>
        <p className="muted">
          Keep the sub-categories under each top-level category current. The top-level categories are fixed.
        </p>
      </div>
      <CategoryManager tops={tops} />
    </>
  );
}
