"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { registerAccount } from "@/lib/api";

type Field = "name" | "email" | "password";
type Errors = Partial<Record<Field, string>>;

const MIN_LENGTH = 8;
const MIN_LENGTH_MESSAGE = "Password must be at least 8 characters.";
const MAX_LENGTH = 128;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors the API rules; the API is the authority.
function validate(v: Record<Field, string>): Errors {
  const errors: Errors = {};
  if (!v.name.trim()) errors.name = "Enter your name.";
  if (!EMAIL.test(v.email.trim())) errors.email = "Enter an email address in the form name@example.com.";
  if (v.password.length < MIN_LENGTH) errors["password"] = MIN_LENGTH_MESSAGE;
  else if (v.password.length > MAX_LENGTH) errors["password"] = `Password must be at most ${MAX_LENGTH} characters.`;
  return errors;
}

const FIELDS: { id: Field; label: string; type: string; autoComplete: string }[] = [
  { id: "name", label: "Name", type: "text", autoComplete: "name" },
  { id: "email", label: "Email", type: "email", autoComplete: "email" },
  { id: "password", label: "Password", type: "password", autoComplete: "new-password" },
];

export function RegisterForm() {
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setRefusal(null);
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    const result = await registerAccount(values);
    setBusy(false);
    if (result.ok) {
      router.push("/account");
      return;
    }
    if (result.fieldErrors) setErrors(result.fieldErrors as Errors);
    else setRefusal(result.message ?? "Something went wrong. Try again.");
  }

  const count = Object.keys(errors).length;

  return (
    <form className="card auth-card stack" noValidate onSubmit={onSubmit}>
      {refusal && (
        <div className="alert alert-danger" role="alert">
          {refusal}
        </div>
      )}
      <h1>Create your account</h1>
      {count === 0 && !refusal && (
        <p className="text-muted">Use your name, email and a password of at least 8 characters.</p>
      )}
      {count > 0 && (
        <div className="alert alert-danger" role="alert">
          <span className="alert-title">Fix {count} {count === 1 ? "thing" : "things"} to continue</span>
          Your details are kept below.
        </div>
      )}
      {FIELDS.map((f) => {
        const error = errors[f.id];
        const describedBy = error ? `${f.id}-error` : f.id === "password" ? "password-hint" : undefined;
        return (
          <div className="field" key={f.id}>
            <label htmlFor={f.id}>{f.label}</label>
            <input
              className={`input${error ? " is-invalid" : ""}`}
              id={f.id}
              name={f.id}
              type={f.type}
              autoComplete={f.autoComplete}
              value={values[f.id]}
              onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
              aria-invalid={error ? "true" : undefined}
              aria-describedby={describedBy}
            />
            {error ? (
              <span className="field-error" id={`${f.id}-error`}>
                {error}
              </span>
            ) : (
              f.id === "password" && (
                <span className="field-hint" id="password-hint">
                  At least 8 characters.
                </span>
              )
            )}
          </div>
        );
      })}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy && <span className="spinner" aria-hidden="true" />}
        Create account
      </button>
      <p className="text-muted">
        Already have an account?{" "}
        <Link className="btn btn-ghost btn-sm" href="/sign-in">
          Sign in
        </Link>
      </p>
    </form>
  );
}
