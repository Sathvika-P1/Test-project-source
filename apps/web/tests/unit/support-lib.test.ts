import { afterEach, describe, expect, it, vi } from "vitest";
import { sendSupportRequest } from "@/lib/support";

const input = { topic: "Other", orderNumber: "SW-10482", message: "Hello" };

describe("sendSupportRequest", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    [201, "sent"],
    [401, "not_signed_in"],
    [422, "order_not_found"],
    [400, "failed"],
    [500, "failed"],
  ])("maps HTTP %i to %s", async (code, status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: code }));
    expect(await sendSupportRequest(input)).toEqual({ status });
  });

  it("maps a network error to failed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await sendSupportRequest(input)).toEqual({ status: "failed" });
  });
});
