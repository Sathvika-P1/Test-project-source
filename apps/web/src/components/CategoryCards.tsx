interface Props {
  top: string;
  subcategories: { id: number; name: string }[];
}

/** The "Shop by category" cards for one top-level category. */
export function CategoryCards({ top, subcategories }: Props) {
  if (subcategories.length === 0) {
    return (
      <div className="empty-state" data-top={top}>
        <h3>No categories to shop yet</h3>
        <p className="muted">Check back soon, or browse everything in Shop.</p>
      </div>
    );
  }
  return (
    <div className="grid">
      {subcategories.map((s) => (
        <div className="card shop-card" key={s.id}>
          <div className="ph" aria-hidden="true">
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
            </svg>
          </div>
          <strong>{s.name}</strong>
        </div>
      ))}
    </div>
  );
}
