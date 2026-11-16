"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { SUPPORT_TOPICS, sendSupportRequest } from "@/lib/support";

type FieldName = "order" | "topic" | "message";

export function SupportForm() {
  const orderRef = useRef<HTMLInputElement>(null);
  const topicRef = useRef<HTMLSelectElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [invalid, setInvalid] = useState<FieldName[]>([]);
  const [sending, setSending] = useState(false);

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
    setSending(true);
    try {
      // The result is not shown here; confirmation and errors belong to the next story.
      await sendSupportRequest({
        topic: values.topic,
        orderNumber: values.order,
        message: values.message,
      });
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
      <form className="stack" noValidate onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="support-order">Order number</label>
          <input
            ref={orderRef}
            className={invalidClass("order", "input")}
            id="support-order"
            name="order"
            autoComplete="off"
            placeholder="e.g. SW-10482"
            aria-describedby="support-order-hint"
            {...flag("order")}
          />
          <span className="field-hint" id="support-order-hint">
            It starts with SW- and is in your order confirmation email.
          </span>
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
    </div>
  );
}
