"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="p-[var(--space-3)] text-[color:var(--color-fg)]">
      <p role="alert">Something went wrong loading the catalogue.</p>
      <button type="button" onClick={reset} className="underline">
        Try again
      </button>
    </main>
  );
}
