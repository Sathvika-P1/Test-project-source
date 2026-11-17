import Link from "next/link";
import { cookies } from "next/headers";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { getOrders } from "@/lib/adminOrders";
import { formatDate, formatMoney } from "@/lib/orderFormat";

/** No role check here: the admin layout is the only gate. */
export default async function OrdersPage() {
  const cookieHeader = (await cookies()).toString();
  const result = await getOrders(cookieHeader || null);

  return (
    <>
      <div className="page-head">
        <h1>Orders</h1>
        <p className="muted">Open an order to update its status or cancel it.</p>
      </div>
      {result.status === "error" ? (
        <div className="alert alert-danger" role="alert">
          <div className="alert-title">Couldn&apos;t load orders</div>
          <p>The orders list didn&apos;t load, so nothing is lost. Check your connection and try again.</p>
          <Link className="btn btn-secondary" href="/admin/orders">
            Try again
          </Link>
        </div>
      ) : result.orders.length === 0 ? (
        <div className="empty-state card stack">
          <h2>No orders yet</h2>
          <p className="muted">
            Orders appear here as soon as a shopper checks out. Support requests show beside the order
            they belong to.
          </p>
          <Link className="btn btn-secondary" href="/admin/products">
            Go to products
          </Link>
        </div>
      ) : (
        <div className="card">
          <table className="orders">
            <caption className="muted orders-caption">
              <span role="status">{result.orders.length} orders</span>
            </caption>
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Customer</th>
                <th scope="col">Placed</th>
                <th scope="col">Status</th>
                <th scope="col">Support</th>
                <th scope="col" className="num">
                  Total
                </th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {result.orders.map((o) => (
                <tr key={o.id}>
                  <td data-label="Order">
                    <strong>{o.id}</strong>
                  </td>
                  <td data-label="Customer">{o.customer}</td>
                  <td data-label="Placed">{formatDate(o.placedAt)}</td>
                  <td data-label="Status">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td data-label="Support">
                    {o.hasSupportRequest ? (
                      <span className="badge badge-warning">Support request</span>
                    ) : (
                      <span className="muted">None</span>
                    )}
                  </td>
                  <td data-label="Total" className="num">
                    {formatMoney(o.total, o.currency)}
                  </td>
                  <td className="open">
                    <Link
                      className="btn btn-secondary"
                      href={`/admin/orders/${o.id}`}
                      aria-label={`Open order ${o.id}`}
                    >
                      Open order
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
