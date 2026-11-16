export const SUPPORT_TOPICS = [
  "Delivery delay",
  "Wrong or damaged item",
  "Refund or return",
  "Cancel or change order",
  "Other",
] as const;

export type SupportRequestInput = { topic: string; orderNumber: string; message: string };

/** Resolves to `sent: true` only when the API stored the request (HTTP 201). */
export async function sendSupportRequest(input: SupportRequestInput): Promise<{ sent: boolean }> {
  try {
    const res = await fetch("/api/support-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return { sent: res.status === 201 };
  } catch {
    return { sent: false };
  }
}
