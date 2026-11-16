import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupportForm } from "@/components/SupportForm";
import * as supportLib from "@/lib/support";

vi.mock("@/lib/support", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/support")>()),
  sendSupportRequest: vi.fn().mockResolvedValue({ status: "sent" }),
}));

const TOPICS = [
  "Delivery delay",
  "Wrong or damaged item",
  "Refund or return",
  "Cancel or change order",
  "Other",
];

const filled = { order: "SW-10482", topic: "Wrong or damaged item", message: "The mug arrived chipped." };

function fill(values: { order: string; topic: string; message: string }) {
  fireEvent.change(screen.getByLabelText("Order number"), { target: { value: values.order } });
  fireEvent.change(screen.getByLabelText("Topic"), { target: { value: values.topic } });
  fireEvent.change(screen.getByLabelText("Message"), { target: { value: values.message } });
}

const send = () => fireEvent.click(screen.getByRole("button", { name: /send/i }));

describe("SupportForm", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(supportLib.sendSupportRequest).mockClear();
  });

  it("shows the topic, order number and message fields and a send button", () => {
    render(<SupportForm />);
    expect(screen.getByLabelText("Order number")).toBeInTheDocument();
    expect(screen.getByLabelText("Topic")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });

  it("offers exactly the five topics", () => {
    render(<SupportForm />);
    const names = screen.getAllByRole("option").map((o) => o.textContent);
    expect(names).toEqual(TOPICS);
  });

  it.each(["topic", "order", "message"] as const)("does not send when %s is empty", (field) => {
    render(<SupportForm />);
    fill({ ...filled, [field]: field === "message" ? "   " : "" });
    send();
    expect(supportLib.sendSupportRequest).not.toHaveBeenCalled();
    const control = screen.getByLabelText(
      { topic: "Topic", order: "Order number", message: "Message" }[field],
    );
    expect(control).toHaveAttribute("aria-invalid", "true");
  });

  it("sends the trimmed values when all three are filled", async () => {
    render(<SupportForm />);
    fill({ ...filled, order: " SW-10482 " });
    send();
    await waitFor(() =>
      expect(supportLib.sendSupportRequest).toHaveBeenCalledWith({
        topic: "Wrong or damaged item",
        orderNumber: "SW-10482",
        message: "The mug arrived chipped.",
      }),
    );
  });

  it("shows a confirmation on the same screen when the send succeeds", async () => {
    vi.mocked(supportLib.sendSupportRequest).mockResolvedValueOnce({ status: "sent" });
    render(<SupportForm />);
    fill(filled);
    send();
    expect(await screen.findByText("Request sent")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("your request has been received");
    expect(screen.getByRole("heading", { name: "Customer support" })).toBeInTheDocument();
  });

  it("clears the form and stays on the screen after Send another request", async () => {
    vi.mocked(supportLib.sendSupportRequest).mockResolvedValueOnce({ status: "sent" });
    render(<SupportForm />);
    fill(filled);
    send();
    fireEvent.click(await screen.findByRole("button", { name: "Send another request" }));
    expect(screen.queryByText("Request sent")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Order number")).toHaveValue("");
    expect(screen.getByLabelText("Topic")).toHaveValue("");
    expect(screen.getByLabelText("Message")).toHaveValue("");
    expect(screen.getByRole("heading", { name: "Customer support" })).toBeInTheDocument();
  });

  it("shows an inline not-sent error when the order is not the shopper's", async () => {
    vi.mocked(supportLib.sendSupportRequest).mockResolvedValueOnce({ status: "order_not_found" });
    render(<SupportForm />);
    fill({ ...filled, order: "SW-10099" });
    send();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Your request was not sent");
    expect(screen.getByLabelText("Order number")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText("Request sent")).not.toBeInTheDocument();
  });

  it("shows the same not-sent title for other failures", async () => {
    vi.mocked(supportLib.sendSupportRequest).mockResolvedValueOnce({ status: "failed" });
    render(<SupportForm />);
    fill(filled);
    send();
    expect(await screen.findByRole("alert")).toHaveTextContent("Your request was not sent");
    expect(screen.queryByText("Request sent")).not.toBeInTheDocument();
  });

  it("keeps the typed topic, order number and message after an error", async () => {
    vi.mocked(supportLib.sendSupportRequest).mockResolvedValueOnce({ status: "order_not_found" });
    render(<SupportForm />);
    fill({ ...filled, order: "SW-10099" });
    send();
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Order number")).toHaveValue("SW-10099");
    expect(screen.getByLabelText("Topic")).toHaveValue("Wrong or damaged item");
    expect(screen.getByLabelText("Message")).toHaveValue("The mug arrived chipped.");
  });

  it("prompts a signed-out shopper to sign in and keeps what they typed", async () => {
    vi.mocked(supportLib.sendSupportRequest).mockResolvedValueOnce({ status: "not_signed_in" });
    render(<SupportForm />);
    fill(filled);
    send();
    expect(await screen.findByText("Sign in to send your request")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByText("Request sent")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toHaveValue("The mug arrived chipped.");
  });

  it("shows a Back to home link to the home page", () => {
    render(<SupportForm />);
    const link = screen.getByRole("link", { name: /back to home/i });
    expect(link).toHaveAttribute("href", "/");
    expect(link).toBeVisible();
  });
});
