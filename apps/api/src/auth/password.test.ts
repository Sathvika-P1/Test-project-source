import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('verifies the right password and rejects another', async () => {
    const hash = await hashPassword('correct-horse');
    expect(hash).not.toContain('correct-horse');
    expect(await verifyPassword('correct-horse', hash)).toBe(true);
    expect(await verifyPassword('wrong-pass', hash)).toBe(false);
  });
});
