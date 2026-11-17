export default function AdminLoading() {
  return (
    <div className="container page">
      <div className="gate stack" role="status" aria-live="polite">
        <p className="muted">Checking your access…</p>
        <div className="skeleton sk" />
        <div className="skeleton sk" />
      </div>
    </div>
  );
}
