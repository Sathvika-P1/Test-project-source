import { describe, expect, it } from 'vitest';
import { validateRegistration } from './validation.js';

const ok = { name: 'Asha', email: 'asha@example.com', password: 'correct-horse' };

describe('validateRegistration', () => {
  it.each(['name', 'email', 'password'])('refuses empty %s (AC14)', (field) => {
    const errors = validateRegistration({ ...ok, [field]: '' }) as Record<string, string>;
    expect(errors[field]).toBeDefined();
  });
  it('refuses a 7 character password (AC15)', () => {
    expect(validateRegistration({ name: 'A', email: 'a@example.com', password: '1234567' }).password).toBe(
      'Password must be at least 8 characters.',
    );
  });
  it('accepts exactly 8 characters (AC16)', () => {
    expect(validateRegistration({ name: 'A', email: 'a@example.com', password: '12345678' })).toEqual({});
  });
  it.each(['asha@example', 'asha.example.com', '@example.com', 'a b@example.com'])('refuses %s (AC17)', (email) => {
    expect(validateRegistration({ ...ok, email }).email).toBe('Enter an email address in the form name@example.com.');
  });
});
