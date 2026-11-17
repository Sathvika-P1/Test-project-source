export default function Loading() {
  return (
    <div className="card" role="status" aria-live="polite">
      <p className="muted">Loading sub-categories…</p>
      <div className="skeleton sk" />
      <div className="skeleton sk" />
      <div className="skeleton sk" />
    </div>
  );
}
