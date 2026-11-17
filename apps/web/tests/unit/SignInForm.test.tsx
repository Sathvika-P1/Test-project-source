import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInForm, safeNext } from "@/components/SignInForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const signIn = vi.fn();
vi.mock("@/lib/api", () => ({ signIn: (...a: unknown[]) => signIn(...a) }));

function submit() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "asha@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "whatever-1" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("SignInForm", () => {
  beforeEach(() => {
    push.mockReset();
    signIn.mockReset();
  });

  it("AC3 navigates to the account page on success", async () => {
    signIn.mockResolvedValue({ ok: true });
    render(<SignInForm />);
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/account"));
  });

  it("AC6 shows one generic error that does not say which field was wrong", async () => {
    signIn.mockResolvedValue({
      ok: false,
      status: 401,
      message: "Email or password is incorrect. Check both and try again.",
    });
    render(<SignInForm />);
    submit();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Email or password is incorrect. Check both and try again.");
    expect(alert.textContent).not.toMatch(/email is|password is wrong/i);
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
  });

  it("AC19 shows the locked warning and disables submit on 429", async () => {
    signIn.mockResolvedValue({ ok: false, status: 429, message: "Too many failed attempts. Try again in 15 minutes." });
    render(<SignInForm />);
    submit();
    expect(await screen.findByText("Too many failed attempts")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
  });

  it("AC11 explains the checkout redirect and returns there after sign-in", async () => {
    signIn.mockResolvedValue({ ok: true });
    render(<SignInForm next="/checkout" />);
    expect(screen.getByText("Sign in to continue to checkout. Your bag is kept.")).toBeInTheDocument();
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout"));
  });

  it("only follows same-origin relative next paths", () => {
    expect(safeNext("/checkout")).toBe("/checkout");
    expect(safeNext("//evil.example")).toBe("/account");
    expect(safeNext("https://evil.example")).toBe("/account");
    expect(safeNext(undefined)).toBe("/account");
  });
});
