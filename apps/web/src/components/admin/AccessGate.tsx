import Link from "next/link";

interface AccessGateProps {
  variant: "not-admin" | "signed-out";
  email?: string;
}

/** Neutral gate: reveals nothing about the administration area. */
export function AccessGate({ variant, email }: AccessGateProps) {
  if (variant === "signed-out") {
    return (
      <div className="gate card stack">
        <h1>Sign in to continue</h1>
        <p>
          This page is for store staff. Sign in with your account; if you&apos;re an admin you&apos;ll
          come straight back here.
        </p>
        <div className="row">
          <Link className="btn btn-primary" href="/sign-in?returnTo=/admin">
            Sign in
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="gate card stack">
      <h1>You can&apos;t open this page</h1>
      <p>
        Your account doesn&apos;t have access to this area. If you think it should, ask a store admin.
      </p>
      {email ? <p className="muted">Signed in as {email}</p> : null}
      <div className="row">
        <Link className="btn btn-primary" href="/shop">
          Go to Shop
        </Link>
        <Link className="btn btn-secondary" href="/sign-out">
          Sign out
        </Link>
      </div>
    </div>
  );
}
