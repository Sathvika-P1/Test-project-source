export const SUPPORT_TOPICS = [
  'Delivery delay',
  'Wrong or damaged item',
  'Refund or return',
  'Cancel or change order',
  'Other',
] as const;

export type SupportTopic = (typeof SUPPORT_TOPICS)[number];
export type SupportField = 'topic' | 'orderNumber' | 'message';

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_ORDER_NUMBER_LENGTH = 32;

export type ValidSupportRequest = {
  topic: SupportTopic;
  orderNumber: string;
  message: string;
};

export function validateSupportRequest(
  body: unknown,
): { ok: true; value: ValidSupportRequest } | { ok: false; fields: SupportField[] } {
  const raw = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
  const topic = text(raw.topic);
  const orderNumber = text(raw.orderNumber).toUpperCase();
  const message = text(raw.message);

  const fields: SupportField[] = [];
  if (!(SUPPORT_TOPICS as readonly string[]).includes(topic)) fields.push('topic');
  if (!orderNumber || orderNumber.length > MAX_ORDER_NUMBER_LENGTH) fields.push('orderNumber');
  if (!message || message.length > MAX_MESSAGE_LENGTH) fields.push('message');
  if (fields.length > 0) return { ok: false, fields };
  return { ok: true, value: { topic: topic as SupportTopic, orderNumber, message } };
}
