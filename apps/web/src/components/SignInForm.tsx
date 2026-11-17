"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signIn } from "@/lib/api";

/** Only same-origin relative paths are followed after sign-in. */
export function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/account";
}

type Problem = { kind: "wrong"; message: string } | { kind: "locked" } | null;

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState<Problem>(null);
  const [busy, setBusy] = useState(false);
  const target = safeNext(next);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await signIn({ email, password });
    setBusy(false);
    if (result.ok) {
      router.push(target);
    } else if (result.status === 429) {
      setProblem({ kind: "locked" });
    } else {
      setProblem({
        kind: "wrong",
        message: result.message ?? "Email or password is incorrect. Check both and try again.",
      });
    }
  }

  const wrong = problem?.kind === "wrong";

  return (
    <form className="card auth-card stack" noValidate onSubmit={onSubmit}>
      {target === "/checkout" && (
        <div className="alert alert-info" role="status">
          Sign in to continue to checkout. Your bag is kept.
        </div>
      )}
      {problem?.kind === "wrong" && (
        <div className="alert alert-danger" role="alert" id="sign-in-error">
          {problem.message}
        </div>
      )}
      {problem?.kind === "locked" && (
        <div className="alert alert-warning" role="alert">
          <span className="alert-title">Too many failed attempts</span>
          Try again in 15 minutes.
        </div>
      )}
      <h1>Sign in</h1>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          className={`input${wrong ? " is-invalid" : ""}`}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={wrong ? "true" : undefined}
          aria-describedby={wrong ? "sign-in-error" : undefined}
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          className={`input${wrong ? " is-invalid" : ""}`}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={wrong ? "true" : undefined}
          aria-describedby={wrong ? "sign-in-error" : undefined}
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy || problem?.kind === "locked"}>
        {busy && <span className="spinner" aria-hidden="true" />}
        Sign in
      </button>
      <p className="text-muted">
        New here?{" "}
        <Link className="btn btn-ghost btn-sm" href="/register">
          Create an account
        </Link>
      </p>
    </form>
  );
}
