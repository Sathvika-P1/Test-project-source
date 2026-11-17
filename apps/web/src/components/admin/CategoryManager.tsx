"use client";

import { useEffect, useState } from "react";
import {
  addSubcategory,
  removeSubcategory,
  renameSubcategory,
} from "@/app/admin/categories/actions";
import type { AdminSubcategory, AdminTop } from "@/lib/catalogApi";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function nameError(error: string, name: string, top: string): string {
  if (error === "duplicate") return `${name} is already under ${top}. Use a different name.`;
  if (error === "too_long") return "Use 60 characters or fewer.";
  if (error === "empty") return "Enter a name, like Sneakers.";
  return "We couldn't save that. Try again.";
}

export function CategoryManager({ tops }: { tops: AdminTop[] }) {
  const [topSlug, setTopSlug] = useState(tops[0]?.slug ?? "");
  const top = tops.find((t) => t.slug === topSlug) ?? tops[0];
  const subs = top?.subcategories ?? [];

  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const [renaming, setRenaming] = useState<AdminSubcategory | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");
  const [saving, setSaving] = useState(false);

  const [removing, setRemoving] = useState<AdminSubcategory | null>(null);
  const [removePending, setRemovePending] = useState(false);

  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!top) return null;

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return setAddError(nameError("empty", name, top.name));
    setAddError("");
    setAdding(true);
    const res = await addSubcategory(top.slug, name);
    setAdding(false);
    if (!res.ok) return setAddError(nameError(res.error, name, top.name));
    setNewName("");
    setToast(`Added ${name} under ${top.name}`);
  }

  async function onRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renaming) return;
    const name = renameValue.trim();
    if (!name) return setRenameError("Enter a name.");
    setRenameError("");
    setSaving(true);
    const res = await renameSubcategory(renaming.id, name);
    setSaving(false);
    if (!res.ok) return setRenameError(nameError(res.error, name, top.name));
    setRenaming(null);
    setToast(`Renamed to ${name}`);
  }

  function askRemove(sub: AdminSubcategory) {
    if (sub.productCount > 0) {
      setToast(
        `Can't remove ${sub.name}: it has ${plural(sub.productCount, "product", "products")}. Move them first.`,
      );
      return;
    }
    setRemoving(sub);
  }

  async function onRemove() {
    if (!removing) return;
    setRemovePending(true);
    const res = await removeSubcategory(removing.id);
    setRemovePending(false);
    const name = removing.name;
    setRemoving(null);
    setToast(res.ok ? `Removed ${name}` : `Couldn't remove ${name}. Try again.`);
  }

  return (
    <>
      <div className="tops" role="group" aria-label="Top-level categories">
        {tops.map((t) => (
          <button
            key={t.slug}
            type="button"
            className="chip"
            aria-pressed={t.slug === top.slug}
            onClick={() => setTopSlug(t.slug)}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="sec-head">
          <h2>{top.name} sub-categories</h2>
          <span className="muted">{plural(subs.length, "sub-category", "sub-categories")}</span>
        </div>

        <form className="add-form" onSubmit={onAdd} noValidate>
          <div className="field">
            <label htmlFor="new-sub">New sub-category</label>
            <input
              className={`input${addError ? " is-invalid" : ""}`}
              id="new-sub"
              autoComplete="off"
              placeholder="For example, Sneakers"
              value={newName}
              aria-invalid={addError ? true : undefined}
              aria-describedby="new-sub-msg"
              onChange={(e) => setNewName(e.target.value)}
            />
            {addError && (
              <span className="field-error" id="new-sub-msg" role="alert">
                {addError}
              </span>
            )}
          </div>
          <button className="btn btn-primary" type="submit" disabled={adding}>
            {adding ? "Adding..." : "Add sub-category"}
          </button>
        </form>

        <div aria-live="polite">
          {subs.length === 0 ? (
            <div className="empty-state">
              <h3>No sub-categories under {top.name} yet</h3>
              <p className="muted">Add the first one above.</p>
            </div>
          ) : (
            subs.map((s) => (
              <div className="sub-row" key={s.id}>
                <div className="name">
                  <strong>{s.name}</strong>
                  <br />
                  <span className="muted">{plural(s.productCount, "product", "products")}</span>
                </div>
                <div className="acts">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    aria-label={`Rename ${s.name}`}
                    onClick={() => {
                      setRenaming(s);
                      setRenameValue(s.name);
                      setRenameError("");
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    aria-label={`Remove ${s.name}`}
                    onClick={() => askRemove(s)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {renaming && (
        <>
          <div className="backdrop" onClick={() => setRenaming(null)} />
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="rename-title">
            <h2 id="rename-title">Rename sub-category</h2>
            <form className="stack" onSubmit={onRename} noValidate>
              <div className="field">
                <label htmlFor="rename-input">New name</label>
                <input
                  className={`input${renameError ? " is-invalid" : ""}`}
                  id="rename-input"
                  autoComplete="off"
                  autoFocus
                  value={renameValue}
                  aria-invalid={renameError ? true : undefined}
                  aria-describedby="rename-msg"
                  onChange={(e) => setRenameValue(e.target.value)}
                />
                {renameError && (
                  <span className="field-error" id="rename-msg" role="alert">
                    {renameError}
                  </span>
                )}
              </div>
              <p className="muted">
                Products stay in this sub-category. The Shop by category card shows the new name.
              </p>
              <div className="row">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save name"}
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => setRenaming(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {removing && (
        <>
          <div className="backdrop" onClick={() => setRemoving(null)} />
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="remove-title">
            <h2 id="remove-title">Remove {removing.name}?</h2>
            <p>
              The Shop by category card &quot;{removing.name}&quot; disappears from the {top.name} category
              page. No products are affected.
            </p>
            <div className="row">
              <button className="btn btn-danger" type="button" disabled={removePending} onClick={onRemove}>
                {removePending ? "Removing..." : "Remove sub-category"}
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => setRemoving(null)}>
                Keep it
              </button>
            </div>
          </div>
        </>
      )}

      <div className={`toast${toast ? " is-open" : ""}`} role="status">
        {toast}
      </div>
    </>
  );
}
