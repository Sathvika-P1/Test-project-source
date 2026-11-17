import Link from "next/link";

export function AuthHeader({ switchTo }: { switchTo: "sign-in" | "register" }) {
  return (
    <header className="auth-header">
      <Link className="auth-brand" href="/">
        Shopping Website
      </Link>
      <nav className="auth-links" aria-label="Account">
        <Link className="btn btn-ghost" href="/shop">
          Shop
        </Link>
        {switchTo === "sign-in" ? (
          <Link className="btn btn-secondary" href="/sign-in">
            Sign in
          </Link>
        ) : (
          <Link className="btn btn-secondary" href="/register">
            Create account
          </Link>
        )}
      </nav>
    </header>
  );
}
