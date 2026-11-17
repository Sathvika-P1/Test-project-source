const AREAS = [
  { id: "products", title: "Products and prices" },
  { id: "categories", title: "Categories" },
  { id: "stock", title: "Stock by size" },
  { id: "orders", title: "Orders" },
];

export default function AdminHome() {
  return (
    <>
      <div className="page-head">
        <h1>Store administration</h1>
        <p className="muted">Keep the catalogue and orders up to date.</p>
      </div>
      <div className="grid">
        {AREAS.map((area) => (
          <div key={area.id} className="card stack">
            <h2>{area.title}</h2>
            <button type="button" className="btn btn-secondary" disabled aria-disabled="true">
              Coming soon
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
