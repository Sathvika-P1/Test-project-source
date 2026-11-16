export const SUPPORT_TOPICS = [
  "Delivery delay",
  "Wrong or damaged item",
  "Refund or return",
  "Cancel or change order",
  "Other",
] as const;

export type SupportRequestInput = { topic: string; orderNumber: string; message: string };

export type SendResult =
  | { status: "sent" }
  | { status: "not_signed_in" }
  | { status: "order_not_found" }
  | { status: "failed" };

// Maps the API answer: 201 stored, 401 not signed in, 422 order not found, anything else failed.
export async function sendSupportRequest(input: SupportRequestInput): Promise<SendResult> {
  try {
    const res = await fetch("/api/support-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.status === 201) return { status: "sent" };
    if (res.status === 401) return { status: "not_signed_in" };
    if (res.status === 422) return { status: "order_not_found" };
    return { status: "failed" };
  } catch {
    return { status: "failed" };
  }
}
