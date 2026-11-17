"use client";

import { useEffect, useState } from "react";
import { moveProduct } from "@/app/admin/categories/actions";
import type { AdminProduct, AdminTop } from "@/lib/catalogApi";

export function MoveProductForm({ tops, products }: { tops: AdminTop[]; products: AdminProduct[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? 0);
  const product = products.find((p) => p.id === productId) ?? products[0];
  const [choice, setChoice] = useState(String(product?.subcategoryId ?? ""));
  const [fieldError, setFieldError] = useState(false);
  const [alert, setAlert] = useState("");
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!product) {
    return (
      <div className="card">
        <div className="empty-state">
          <p>No products to move yet.</p>
        </div>
      </div>
    );
  }

  const top = tops.find((t) => t.slug === product.topSlug);
  const options = top?.subcategories ?? [];

  function pick(id: number) {
    const next = products.find((p) => p.id === id);
    setProductId(id);
    setChoice(String(next?.subcategoryId ?? ""));
    setFieldError(false);
    setAlert("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!choice) {
      setFieldError(true);
      setAlert(`${product.name} stays in ${product.subcategoryName}. Choose a sub-category and save again.`);
      return;
    }
    setPending(true);
    const res = await moveProduct(product.id, Number(choice));
    setPending(false);
    if (!res.ok) {
      setFieldError(res.error === "subcategory_required");
      setAlert(`${product.name} stays in ${product.subcategoryName}. Choose a sub-category and save again.`);
      return;
    }
    setAlert("");
    const name = options.find((s) => String(s.id) === choice)?.name ?? "";
    setToast(`Saved. ${product.name} is now in ${name}`);
  }

  const inTop = products.filter((p) => p.topSlug === product.topSlug);

  return (
    <div className="grid move-grid">
      <div className="card">
        <form className="form stack" onSubmit={onSubmit} noValidate>
          {alert && (
            <div className="alert alert-danger" role="alert">
              <div className="alert-title">Not saved</div>
              <span>{alert}</span>
            </div>
          )}
          <div className="field">
            <label htmlFor="mv-product">Product</label>
            <select
              className="select"
              id="mv-product"
              value={product.id}
              onChange={(e) => pick(Number(e.target.value))}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.topName})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="mv-sub">Sub-category</label>
            <select
              className={`select${fieldError ? " is-invalid" : ""}`}
              id="mv-sub"
              value={choice}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby="mv-hint mv-err"
              onChange={(e) => {
                setChoice(e.target.value);
                setFieldError(false);
              }}
            >
              <option value="">Choose a sub-category</option>
              {options.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="field-hint" id="mv-hint">
              Currently in {product.subcategoryName}.
            </span>
            {fieldError && (
              <span className="field-error" id="mv-err">
                Choose a sub-category. Every product needs one.
              </span>
            )}
          </div>
          <div>
            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save sub-category"}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="sec-head">
          <h2>{product.topName} products by sub-category</h2>
        </div>
        <div aria-live="polite">
          {options.map((s) => {
            const members = inTop.filter((p) => p.subcategoryId === s.id);
            return (
              <div className="sub-row" key={s.id}>
                <div className="name">
                  <strong>{s.name}</strong>
                  {members.length ? (
                    <ul className="members">
                      {members.map((p) => (
                        <li key={p.id}>{p.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <>
                      <br />
                      <span className="muted">No products</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`toast${toast ? " is-open" : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}
