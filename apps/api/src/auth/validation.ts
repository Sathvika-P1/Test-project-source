export interface RegistrationInput {
  name: string;
  email: string;
  password: string;
}

export type FieldErrors = Partial<Record<keyof RegistrationInput, string>>;

export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 128;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateRegistration(input: RegistrationInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.name.trim()) errors.name = 'Enter your name.';
  if (!EMAIL.test(input.email.trim())) errors.email = 'Enter an email address in the form name@example.com.';
  if (input.password.length < MIN_PASSWORD || input.password.length > MAX_PASSWORD) {
    errors.password =
      input.password.length > MAX_PASSWORD
        ? `Password must be at most ${MAX_PASSWORD} characters.`
        : 'Password must be at least 8 characters.';
  }
  return errors;
}
