"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { SUPPORT_TOPICS, sendSupportRequest, type SupportRequestInput } from "@/lib/support";

// The sign-in page does not exist yet; this is the single place to change when it does.
const SIGN_IN_HREF = "/sign-in";

type Outcome = "idle" | "sent" | "order_not_found" | "not_signed_in" | "failed";

type FieldName = "order" | "topic" | "message";

export function SupportForm() {
  const orderRef = useRef<HTMLInputElement>(null);
  const topicRef = useRef<HTMLSelectElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [invalid, setInvalid] = useState<FieldName[]>([]);
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>("idle");
  const [sentValues, setSentValues] = useState<SupportRequestInput | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const focusOrder = useRef(false);

  useEffect(() => {
    if (outcome !== "idle") {
      resultRef.current?.focus();
    } else if (focusOrder.current) {
      focusOrder.current = false;
      orderRef.current?.focus();
    }
  }, [outcome]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = {
      order: orderRef.current?.value.trim() ?? "",
      topic: topicRef.current?.value.trim() ?? "",
      message: messageRef.current?.value.trim() ?? "",
    };
    const refs = { order: orderRef, topic: topicRef, message: messageRef };
    const empty = (["order", "topic", "message"] as FieldName[]).filter((name) => !values[name]);
    setInvalid(empty);
    if (empty.length > 0) {
      refs[empty[0]].current?.focus();
      return;
    }
    const request = { topic: values.topic, orderNumber: values.order, message: values.message };
    setSentValues(request);
    setOutcome("idle");
    setSending(true);
    try {
      const result = await sendSupportRequest(request);
      setOutcome(result.status);
    } finally {
      setSending(false);
    }
  }

  const flag = (name: FieldName) => ({
    "aria-required": true as const,
    "aria-invalid": invalid.includes(name) ? (true as const) : undefined,
  });
  const invalidClass = (name: FieldName, base: string) =>
    invalid.includes(name) ? `${base} is-invalid` : base;

  const orderNotFound = outcome === "order_not_found";

  return (
    <div className="support stack">
      <div>
        <Link href="/" className="btn btn-ghost btn-sm back">
          <svg className="icon" aria-hidden="true" viewBox="0 0 24 24">
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          Back to home
        </Link>
        <h1 className="support-head">Customer support</h1>
        <p className="text-muted">Tell us what you need help with and we will get back to you.</p>
      </div>
      {outcome === "sent" && sentValues ? (
        <>
          <div ref={resultRef} className="alert alert-success" role="status" tabIndex={-1}>
            <p className="alert-title">Request sent</p>
            <p>Thanks, your request has been received.</p>
            <dl>
              <dt>Order</dt>
              <dd>{sentValues.orderNumber}</dd>
              <dt>Topic</dt>
              <dd>{sentValues.topic}</dd>
              <dt>Message sent</dt>
              <dd>{sentValues.message}</dd>
            </dl>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              focusOrder.current = true;
              setOutcome("idle");
            }}
          >
            Send another request
          </button>
        </>
      ) : (
      <form className="stack" noValidate onSubmit={onSubmit}>
        {(orderNotFound || outcome === "failed") && (
          <div ref={resultRef} className="alert alert-danger" role="alert" tabIndex={-1}>
            <p className="alert-title">Your request was not sent</p>
            <p>
              {orderNotFound
                ? `${sentValues?.orderNumber} is not one of your orders. Use one of your own order numbers, then send again. Everything you typed is still here.`
                : "Something went wrong on our side. Try sending again in a moment."}
            </p>
          </div>
        )}
        {outcome === "not_signed_in" && (
          <div ref={resultRef} className="alert alert-warning" role="alert" tabIndex={-1}>
            <p className="alert-title">Sign in to send your request</p>
            <p>You are not signed in, so nothing was sent. What you typed is kept here.</p>
            <Link href={SIGN_IN_HREF} className="btn btn-primary">
              Sign in
            </Link>
          </div>
        )}
        <div className="field">
          <label htmlFor="support-order">Order number</label>
          <input
            ref={orderRef}
            className={orderNotFound ? "input is-invalid" : invalidClass("order", "input")}
            id="support-order"
            name="order"
            autoComplete="off"
            placeholder="e.g. SW-10482"
            aria-describedby={
              orderNotFound ? "support-order-hint support-order-err" : "support-order-hint"
            }
            {...flag("order")}
            aria-invalid={orderNotFound || invalid.includes("order") ? true : undefined}
          />
          <span className="field-hint" id="support-order-hint">
            It starts with SW- and is in your order confirmation email.
          </span>
          {orderNotFound && (
            <span className="field-error" id="support-order-err">
              <svg className="icon" aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              We can’t find {sentValues?.orderNumber} in your orders. Check the number in your order
              confirmation email.
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="support-topic">Topic</label>
          <select
            ref={topicRef}
            className={invalidClass("topic", "select")}
            id="support-topic"
            name="topic"
            defaultValue=""
            {...flag("topic")}
          >
            <option value="" disabled hidden>
              Choose a topic
            </option>
            {SUPPORT_TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="support-message">Message</label>
          <textarea
            ref={messageRef}
            className={invalidClass("message", "textarea")}
            id="support-message"
            name="message"
            rows={5}
            placeholder="Describe your issue"
            {...flag("message")}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={sending}>
          {sending ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Sending…
            </>
          ) : (
            "Send request"
          )}
        </button>
      </form>
      )}
    </div>
  );
}
