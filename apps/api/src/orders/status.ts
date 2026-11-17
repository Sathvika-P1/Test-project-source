export const ORDER_STATUSES = ['placed', 'packed', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type SettableStatus = Exclude<OrderStatus, 'cancelled'>;

const SETTABLE: readonly string[] = ['placed', 'packed', 'shipped', 'delivered'];

/** Cancelled is final: no other status can follow it. */
export function canChangeStatus(current: OrderStatus): boolean {
  return current !== 'cancelled';
}

/** Returns the status when staff may set it directly, else null ('cancelled' has its own action). */
export function parseSettableStatus(value: unknown): SettableStatus | null {
  return typeof value === 'string' && SETTABLE.includes(value) ? (value as SettableStatus) : null;
}
