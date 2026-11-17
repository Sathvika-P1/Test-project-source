import type { OrderDetail, OrderSummary } from "@/lib/adminOrders";

export const withSupport: OrderDetail = {
  id: "SW-10482",
  customer: "Arjun Rao",
  email: "arjun@example.com",
  placedAt: "2026-11-14T10:00:00.000Z",
  status: "placed",
  hasSupportRequest: true,
  total: 4349,
  currency: "INR",
  address: "12 Lake View Road, Indiranagar, Bengaluru 560038",
  payment: "Paid by UPI",
  items: [
    { name: "Block-print cotton kurta", detail: "Size M × 1", price: 1899 },
    { name: "Terracotta tea set", detail: "Set of 6 × 1", price: 2450 },
  ],
  supportRequest: {
    subject: "Change delivery address",
    message: "Could you deliver to my office instead?",
    sentAt: "2026-11-15T09:00:00.000Z",
  },
};

export const withoutSupport: OrderDetail = {
  ...withSupport,
  id: "SW-10477",
  customer: "Divya Menon",
  status: "packed",
  hasSupportRequest: false,
  supportRequest: null,
};

export const summaries: OrderSummary[] = [withSupport, withoutSupport].map((o) => ({
  id: o.id,
  customer: o.customer,
  placedAt: o.placedAt,
  status: o.status,
  hasSupportRequest: o.hasSupportRequest,
  total: o.total,
  currency: o.currency,
}));
