import { requireUser } from "@/lib/session";

// Guarded entry only; the checkout story owns the content.
export default async function CheckoutPage() {
  await requireUser("/checkout");
  return <h1>Checkout</h1>;
}
