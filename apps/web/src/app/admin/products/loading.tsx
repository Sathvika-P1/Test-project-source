export default function Loading() {
  return (
    <div role="status" aria-live="polite">
      <p className="muted">Loading products…</p>
      <div className="skeleton sk" />
      <div className="skeleton sk" />
      <div className="skeleton sk" />
    </div>
  );
}
