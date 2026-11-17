import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { OrderActions } from "@/components/admin/OrderActions";
import { getOrder } from "@/lib/adminOrders";
import { formatDate, formatMoney } from "@/lib/orderFormat";

/** No role check here: the admin layout is the only gate. */
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieHeader = (await cookies()).toString();
  const result = await getOrder(cookieHeader || null, id);

  if (result.status === "not-found") notFound();

  const back = (
    <Link className="btn btn-ghost back" href="/admin/orders">
      ← Back to orders
    </Link>
  );

  if (result.status === "error") {
    return (
      <>
        {back}
        <div className="alert alert-danger" role="alert">
          <div className="alert-title">Couldn&apos;t load this order</div>
          <p>The order didn&apos;t load. Try again, or go back to the list and open it from there.</p>
          <div className="row">
            <Link className="btn btn-secondary" href={`/admin/orders/${id}`}>
              Try again
            </Link>
            <Link className="btn btn-secondary" href="/admin/orders">
              Back to orders
            </Link>
          </div>
        </div>
      </>
    );
  }

  const o = result.order;
  const support = o.supportRequest;
  return (
    <>
      {back}
      <div className={support ? "split has-support" : "split"}>
        <div className="stack-lg">
          <div className="page-head">
            <h1>Order {o.id}</h1>
            <p className="muted">
              Placed {formatDate(o.placedAt)} by {o.customer}
            </p>
          </div>
          <OrderActions order={{ id: o.id, status: o.status }} />
          <div className="card stack">
            <h2 className="text-lg">Order details</h2>
            <dl className="meta">
              <div>
                <dt>Customer</dt>
                <dd>
                  {o.customer}
                  <br />
                  {o.email}
                </dd>
              </div>
              <div>
                <dt>Deliver to</dt>
                <dd>{o.address}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>{o.payment}</dd>
              </div>
            </dl>
            <div>
              {o.items.map((item, i) => (
                <div key={i} className="line">
                  <span>
                    <strong>{item.name}</strong>
                    <br />
                    <span className="muted">{item.detail}</span>
                  </span>
                  <span>{formatMoney(item.price, o.currency)}</span>
                </div>
              ))}
            </div>
            <div className="total">
              <span>Total</span>
              <span>{formatMoney(o.total, o.currency)}</span>
            </div>
          </div>
        </div>
        {support ? (
          <aside className="card support stack" aria-labelledby="support-title">
            <div className="row support-head">
              <h2 className="text-lg" id="support-title">
                Support request
              </h2>
              <span className="badge badge-warning">From customer</span>
            </div>
            <p>
              <strong>{support.subject}</strong>
              <br />
              <span className="muted">
                Sent {formatDate(support.sentAt)} by {o.customer}
              </span>
            </p>
            <blockquote>{support.message}</blockquote>
            <p className="muted">Replies happen outside this screen for now.</p>
          </aside>
        ) : null}
      </div>
    </>
  );
}
