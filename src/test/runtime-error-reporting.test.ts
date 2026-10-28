import { afterEach, describe, expect, it, vi } from "vitest";

import { reportBoundaryError } from "@/lib/runtime-error-reporting";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("reportBoundaryError", () => {
  it("logs an Error's message, route, stack, and extra context", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const err = new Error("boundary boom");

    reportBoundaryError(err, { boundary: "unit-test" });

    expect(spy).toHaveBeenCalledTimes(1);
    const [label, payload] = spy.mock.calls[0]!;
    expect(label).toBe("[error boundary]");
    expect(payload).toMatchObject({
      message: "boundary boom",
      boundary: "unit-test",
      route: window.location.pathname,
    });
    expect((payload as { stack?: string }).stack).toContain("boundary boom");
  });

  it("describes a Response error with status and url", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    // jsdom Response: construct with a URL-less body, then assert on status formatting.
    const res = new Response("nope", { status: 503 });

    reportBoundaryError(res);

    const payload = spy.mock.calls[0]![1] as { message: string; stack?: string };
    expect(payload.message).toMatch(/^Response 503/);
    expect(payload.stack).toBeUndefined();
  });

  it("stringifies a non-Error, non-Response value", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    reportBoundaryError("plain string failure");

    expect((spy.mock.calls[0]![1] as { message: string }).message).toBe("plain string failure");
  });
});
