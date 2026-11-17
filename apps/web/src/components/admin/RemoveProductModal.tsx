"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { deleteProduct } from "@/app/admin/products/actions";

export function RemoveProductModal({
  product,
  onRemoved,
}: {
  product: { id: string; name: string };
  onRemoved?: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<"not-staff" | "error" | null>(null);
  const [pending, startTransition] = useTransition();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  function close() {
    setOpen(false);
    setProblem(null);
    trigger.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function remove() {
    startTransition(async () => {
      const result = await deleteProduct(product.id);
      if (result.ok) {
        setOpen(false);
        onRemoved?.(product.name);
      } else {
        setProblem(result.reason);
      }
    });
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="btn-ghost"
        aria-label={`Remove ${product.name}`}
        onClick={() => setOpen(true)}
      >
        Remove
      </button>
      {open && (
        <>
          <div className="backdrop" onClick={close} />
          <div
            ref={dialog}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`rm-title-${product.id}`}
            tabIndex={-1}
          >
            <h2 id={`rm-title-${product.id}`} className="card-title">
              Remove this product?
            </h2>
            <p>
              &quot;{product.name}&quot; will no longer be shown on the storefront. This can&apos;t
              be undone.
            </p>
            {problem && (
              <div className="alert alert-danger" role="alert">
                <span className="alert-title">Not saved</span>{" "}
                {problem === "not-staff"
                  ? "Only store staff can remove products, so nothing was changed."
                  : "Something went wrong. Try again."}
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={close}>
                Keep product
              </button>
              <button type="button" className="btn-danger" disabled={pending} onClick={remove}>
                Remove product
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
