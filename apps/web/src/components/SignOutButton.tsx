"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/api";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const [failed, setFailed] = useState(false);

  async function onClick() {
    setBusy(true);
    setFailed(false);
    const result = await signOut();
    if (!result.ok) {
      setBusy(false);
      setFailed(true);
      return;
    }
    router.push("/account?signed-out=1");
    router.refresh();
  }

  return (
    <>
      {failed && (
        <div className="alert alert-danger" role="alert">
          Could not sign you out. Try again.
        </div>
      )}
      <button type="button" className="btn btn-secondary" onClick={onClick} disabled={busy}>
        Sign out
      </button>
    </>
  );
}
