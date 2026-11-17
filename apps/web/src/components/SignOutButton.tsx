"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/api";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    await signOut();
    router.push("/account?signed-out=1");
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-secondary" onClick={onClick} disabled={busy}>
      Sign out
    </button>
  );
}
