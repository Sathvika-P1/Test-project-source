import { describe, expect, it } from 'vitest';
import { canChangeStatus, parseSettableStatus } from './status.js';

describe('order status rules', () => {
  it('cancelled is terminal; every other status may change', () => {
    expect(canChangeStatus('cancelled')).toBe(false);
    for (const s of ['placed', 'packed', 'shipped', 'delivered'] as const) {
      expect(canChangeStatus(s)).toBe(true);
    }
  });

  it('only placed, packed, shipped and delivered can be set', () => {
    expect(parseSettableStatus('shipped')).toBe('shipped');
    expect(parseSettableStatus('cancelled')).toBeNull();
    expect(parseSettableStatus('nonsense')).toBeNull();
    expect(parseSettableStatus(undefined)).toBeNull();
  });
});
