import { cookies } from "next/headers";
import { AccessGate } from "@/components/admin/AccessGate";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { getAdminAccess } from "@/lib/adminAccess";
import "./admin.css";

// The role is decided per request; never cache an admin view.
export const dynamic = "force-dynamic";

/** The ONLY role check of the administration area: child pages carry none. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieHeader = (await cookies()).toString();
  const access = await getAdminAccess(cookieHeader || null);

  if (access.status !== "admin") {
    return (
      <div className="container page">
        <AccessGate variant={access.status} />
      </div>
    );
  }
  return (
    <div className="container page">
      <AdminTabs email={access.email} />
      {children}
    </div>
  );
}
