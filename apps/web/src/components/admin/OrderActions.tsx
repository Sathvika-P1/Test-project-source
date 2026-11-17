"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { cancelOrder, saveStatus } from "@/app/admin/orders/actions";
import type { OrderStatus, SettableStatus } from "@/lib/adminOrders";
import { STATUS_LABELS } from "@/lib/orderFormat";
import { OrderStatusBadge } from "./OrderStatusBadge";

const SETTABLE: SettableStatus[] = ["placed", "packed", "shipped", "delivered"];
const TOAST_MS = 4000;

interface OrderActionsProps {
  order: { id: string; status: OrderStatus };
}

/** Status card: shows the current status and lets staff set it or cancel the order. */
export function OrderActions({ order }: OrderActionsProps) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [choice, setChoice] = useState<SettableStatus>(
    order.status === "cancelled" ? "placed" : order.status,
  );
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const saveRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const selectId = useId();
  const titleId = useId();
  const done = status === "cancelled";

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!confirming) return;
    const dialog = dialogRef.current;
    const focusable = () =>
      Array.from(dialog?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []);
    focusable()[1]?.focus(); // "Keep order": the safe default
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConfirming(false);
      } else if (e.key === "Tab") {
        const els = focusable();
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirming]);

  function onSave() {
    setFailed(null);
    startTransition(async () => {
      const result = await saveStatus(order.id, choice);
      if (result.ok) {
        setStatus(result.status);
        setToast(`Status saved: ${STATUS_LABELS[result.status]}`);
      } else if (result.reason === "cancelled") {
        setStatus("cancelled");
      } else {
        setFailed("The status wasn't saved. Try again.");
      }
      saveRef.current?.focus();
    });
  }

  function onConfirmCancel() {
    setConfirming(false);
    setFailed(null);
    startTransition(async () => {
      const result = await cancelOrder(order.id);
      if (result.ok) {
        setStatus("cancelled");
        setToast("Order cancelled");
      } else {
        setFailed("The order wasn't cancelled. Try again.");
      }
    });
  }

  return (
    <div className="card stack">
      <h2 className="text-lg">Status</h2>
      <p>
        Current status:{" "}
        <span role="status" data-testid="current-status">
          <OrderStatusBadge status={status} />
        </span>
      </p>
      {failed ? (
        <div className="alert alert-danger" role="alert">
          {failed}
        </div>
      ) : null}
      {done ? (
        <p className="muted">This order is cancelled, so its status can no longer change.</p>
      ) : (
        <>
          <div className="status-row">
            <div className="field">
              <label htmlFor={selectId}>Set status</label>
              <select
                id={selectId}
                className="input"
                value={choice}
                onChange={(e) => setChoice(e.target.value as SettableStatus)}
              >
                {SETTABLE.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <button
              ref={saveRef}
              type="button"
              className="btn btn-primary"
              disabled={pending}
              onClick={onSave}
            >
              {pending ? "Saving…" : "Save status"}
            </button>
          </div>
          <div className="divider" />
          <div className="row">
            <button
              type="button"
              className="btn btn-danger"
              disabled={pending}
              onClick={() => setConfirming(true)}
            >
              Cancel order
            </button>
          </div>
          <p className="muted">Refunds and customer notices aren&apos;t sent from here yet.</p>
        </>
      )}

      {confirming ? (
        <>
          <div className="backdrop" onClick={() => setConfirming(false)} />
          <div
            ref={dialogRef}
            className="modal order-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="stack">
              <h2 id={titleId} className="text-lg">
                Cancel order {order.id}?
              </h2>
              <p>
                The order will show as Cancelled and can&apos;t be moved to another status. Refunds and
                customer notices aren&apos;t sent from here yet.
              </p>
              <div className="row">
                <button type="button" className="btn btn-danger" onClick={onConfirmCancel}>
                  Cancel order
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)}>
                  Keep order
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {toast ? (
        <div className="toast is-open order-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
