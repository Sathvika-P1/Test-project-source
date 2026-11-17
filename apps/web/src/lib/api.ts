export interface AuthResult {
  ok: boolean;
  status?: number;
  message?: string;
  fieldErrors?: Record<string, string>;
}

async function post(path: string, body?: unknown): Promise<AuthResult> {
  try {
    const res = await fetch(`/api${path}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.ok) return { ok: true, status: res.status };
    const data = (await res.json().catch(() => ({}))) as { message?: string; fieldErrors?: Record<string, string> };
    return { ok: false, status: res.status, message: data.message, fieldErrors: data.fieldErrors };
  } catch {
    return { ok: false, message: "Something went wrong. Check your connection and try again." };
  }
}

export const registerAccount = (input: { name: string; email: string; password: string }) =>
  post("/auth/register", input);
export const signIn = (input: { email: string; password: string }) => post("/auth/sign-in", input);
export const signOut = () => post("/auth/sign-out");
