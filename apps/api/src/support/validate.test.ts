import { describe, expect, it } from 'vitest';
import { SUPPORT_TOPICS, validateSupportRequest } from './validate.js';

describe('validateSupportRequest', () => {
  it('offers exactly the five topics', () => {
    expect(SUPPORT_TOPICS).toEqual([
      'Delivery delay',
      'Wrong or damaged item',
      'Refund or return',
      'Cancel or change order',
      'Other',
    ]);
  });

  it('rejects an unknown topic', () => {
    expect(
      validateSupportRequest({ topic: 'Nope', orderNumber: 'SW-1', message: 'x' }),
    ).toEqual({ ok: false, fields: ['topic'] });
  });

  it('treats empty and whitespace-only fields as missing', () => {
    expect(validateSupportRequest({ topic: '', orderNumber: '  ', message: '\n' })).toEqual({
      ok: false,
      fields: ['topic', 'orderNumber', 'message'],
    });
    expect(validateSupportRequest(null)).toEqual({
      ok: false,
      fields: ['topic', 'orderNumber', 'message'],
    });
  });

  it('trims and upper-cases the order number', () => {
    expect(
      validateSupportRequest({ topic: 'Other', orderNumber: ' sw-10482 ', message: ' hi ' }),
    ).toEqual({ ok: true, value: { topic: 'Other', orderNumber: 'SW-10482', message: 'hi' } });
  });

  it('caps lengths', () => {
    expect(
      validateSupportRequest({
        topic: 'Other',
        orderNumber: 'S'.repeat(33),
        message: 'x'.repeat(2001),
      }),
    ).toEqual({ ok: false, fields: ['orderNumber', 'message'] });
  });
});
