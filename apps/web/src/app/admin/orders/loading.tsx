export default function OrdersLoading() {
  return (
    <div role="status" aria-live="polite">
      <p className="muted">Loading orders…</p>
      <div className="skeleton sk" />
      <div className="skeleton sk" />
      <div className="skeleton sk" />
      <div className="skeleton sk" />
    </div>
  );
}
