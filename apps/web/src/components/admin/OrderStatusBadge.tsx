import type { OrderStatus } from "@/lib/adminOrders";
import { STATUS_LABELS } from "@/lib/orderFormat";

const BADGE: Record<OrderStatus, string> = {
  placed: "badge-neutral",
  packed: "badge-warning",
  shipped: "badge-warning",
  delivered: "badge-success",
  cancelled: "badge-danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge ${BADGE[status]}`}>{STATUS_LABELS[status]}</span>;
}
