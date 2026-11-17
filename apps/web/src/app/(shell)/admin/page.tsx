import Link from "next/link";
import { requireUser, apiFetch } from "@/lib/session";

export default async function AdminPage() {
  const user = await requireUser("/admin");
  const res = await apiFetch("/admin/status");

  if (res.status === 403 || user.role !== "admin") {
    return (
      <div className="stack-lg">
        <div className="alert alert-danger" role="alert">
          <span className="alert-title">You do not have access to store administration.</span>
          This account does not have the admin role.
        </div>
        <div>
          <Link className="btn btn-secondary" href="/account">
            Back to account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <div className="acct-head">
        <h1>Store administration</h1>
        <span className="badge badge-neutral">Admin</span>
      </div>
      <p className="text-muted">Signed in as {user.name} (admin).</p>
      <div className="admin-area">
        <p>Store administration is open to this account.</p>
      </div>
      <div>
        <Link className="btn btn-secondary" href="/account">
          Back to account
        </Link>
      </div>
    </div>
  );
}
