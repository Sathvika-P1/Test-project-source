export default function OrderLoading() {
  return (
    <div role="status" aria-live="polite">
      <p className="muted">Loading order…</p>
      <div className="skeleton sk" />
      <div className="skeleton sk" />
      <div className="skeleton sk" />
    </div>
  );
}
