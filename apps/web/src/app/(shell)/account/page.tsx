import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { apiFetch, getCurrentUser, requireUser } from "@/lib/session";

interface Summary {
  bag: { name: string; quantity: number }[];
  saved: { name: string }[];
  orders: { number: string; status: string }[];
}

function EmptyHint({ what }: { what: string }) {
  return (
    <div className="empty-state">
      <p>Nothing in {what} yet.</p>
      <Link className="btn btn-secondary btn-sm" href="/shop">
        Shop
      </Link>
    </div>
  );
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ "signed-out"?: string }> }) {
  const params = await searchParams;
  if (params["signed-out"] && !(await getCurrentUser())) {
    return (
      <div className="stack-lg">
        <div className="alert alert-success" role="status">
          You are signed out.
        </div>
        <div className="empty-state">
          <h2>Sign in to view your account</h2>
          <p>Your bag, Saved items and orders are shown after you sign in.</p>
          <div className="cluster">
            <Link className="btn btn-primary" href="/sign-in">
              Sign in
            </Link>
            <Link className="btn btn-secondary" href="/register">
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const user = await requireUser("/account");
  const res = await apiFetch("/account/summary");
  if (!res.ok) redirect("/sign-in?next=%2Faccount");
  const summary = (await res.json()) as Summary;

  return (
    <div className="stack-lg">
      <div className="acct-head">
        <h1>Your account</h1>
        <SignOutButton />
      </div>
      <p className="text-muted">
        Signed in as {user.name} ({user.email})
      </p>
      <div className="grid">
        <section className="card" aria-labelledby="h-bag">
          <h2 className="card-title" id="h-bag">
            Bag ({summary.bag.length})
          </h2>
          {summary.bag.length === 0 ? (
            <EmptyHint what="your bag" />
          ) : (
            <ul className="acct-list">
              {summary.bag.map((i) => (
                <li key={i.name}>
                  {i.name}
                  {i.quantity > 1 && <span className="text-muted">×{i.quantity}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card" aria-labelledby="h-saved">
          <h2 className="card-title" id="h-saved">
            Saved ({summary.saved.length})
          </h2>
          {summary.saved.length === 0 ? (
            <EmptyHint what="Saved" />
          ) : (
            <ul className="acct-list">
              {summary.saved.map((i) => (
                <li key={i.name}>{i.name}</li>
              ))}
            </ul>
          )}
        </section>
        <section className="card" aria-labelledby="h-orders">
          <h2 className="card-title" id="h-orders">
            Orders ({summary.orders.length})
          </h2>
          {summary.orders.length === 0 ? (
            <EmptyHint what="orders" />
          ) : (
            <ul className="acct-list">
              {summary.orders.map((o) => (
                <li key={o.number}>
                  Order {o.number} <span className="badge badge-success">{o.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <div className="cluster">
        <Link className="btn btn-secondary" href="/admin">
          Open store administration
        </Link>
      </div>
    </div>
  );
}
