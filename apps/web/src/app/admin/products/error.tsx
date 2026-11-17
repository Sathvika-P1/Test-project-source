"use client";

export default function ProductsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="alert alert-danger" role="alert">
      <span className="alert-title">Products didn&apos;t load</span> Check your connection and try
      again.
      <div>
        <button type="button" className="btn-secondary" onClick={reset}>
          Retry
        </button>
      </div>
    </div>
  );
}
