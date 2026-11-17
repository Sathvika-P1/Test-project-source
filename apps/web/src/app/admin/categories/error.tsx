"use client";

export default function CategoriesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="alert alert-danger" role="alert">
      <div className="alert-title">Sub-categories didn&apos;t load</div>
      <p>We couldn&apos;t reach the catalogue. Check your connection and try again.</p>
      <button className="btn btn-secondary" type="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
