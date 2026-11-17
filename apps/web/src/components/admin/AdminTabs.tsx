import Link from "next/link";

const TABS = [
  { id: "overview", label: "Overview", href: "/admin" },
  { id: "products", label: "Products", href: "/admin/products" },
  { id: "orders", label: "Orders", href: "/admin/orders" },
];

export function AdminTabs({ email }: { email: string }) {
  return (
    <nav className="admin-bar" aria-label="Administration">
      <strong>Admin</strong>
      {TABS.map((tab) => (
        <Link key={tab.id} className="btn btn-ghost" href={tab.href}>
          {tab.label}
        </Link>
      ))}
      <span className="muted who">
        Signed in as {email} <span className="badge badge-success">Admin</span>
      </span>
    </nav>
  );
}
