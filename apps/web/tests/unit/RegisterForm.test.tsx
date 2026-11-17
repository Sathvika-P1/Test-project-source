import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterForm } from "@/components/RegisterForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const registerAccount = vi.fn();
vi.mock("@/lib/api", () => ({ registerAccount: (...a: unknown[]) => registerAccount(...a) }));

function fill(name: string, email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
}

describe("RegisterForm", () => {
  beforeEach(() => {
    push.mockReset();
    registerAccount.mockReset();
  });

  it("AC14 shows every empty field as invalid and does not call the API", () => {
    render(<RegisterForm />);
    fill("", "", "");
    expect(screen.getByRole("alert")).toHaveTextContent("Fix 3 things to continue");
    for (const label of ["Name", "Email", "Password"]) {
      expect(screen.getByLabelText(label)).toHaveAttribute("aria-invalid", "true");
    }
    expect(registerAccount).not.toHaveBeenCalled();
  });

  it("AC15/AC17 refuses a short password and a malformed email, keeping input", () => {
    render(<RegisterForm />);
    fill("Asha", "asha@example", "1234567");
    expect(screen.getByRole("alert")).toHaveTextContent("Fix 2 things to continue");
    expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
    expect(screen.getByText("Enter an email address in the form name@example.com.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Asha");
  });

  it("AC12 goes to the account page after a successful registration", async () => {
    registerAccount.mockResolvedValue({ ok: true });
    render(<RegisterForm />);
    fill("Asha", "asha@example.com", "12345678");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/account"));
  });

  it("AC13 shows the generic refusal when the email is taken", async () => {
    const message = "We could not create an account with these details. Try different details or sign in.";
    registerAccount.mockResolvedValue({ ok: false, message });
    render(<RegisterForm />);
    fill("Asha", "asha@example.com", "12345678");
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(push).not.toHaveBeenCalled();
  });
});
