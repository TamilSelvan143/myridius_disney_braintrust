import { describe, expect, it } from "vitest";

import { consumeLastCapturedError, describeError } from "@/lib/error-capture";

describe("describeError", () => {
  it("includes the message for a plain Error", () => {
    const text = describeError(new Error("boom"));
    expect(text).toContain("boom");
  });

  it("expands the cause chain", () => {
    const root = new Error("root cause");
    const wrapper = new Error("outer", { cause: root });
    const text = describeError(wrapper);
    expect(text).toContain("outer");
    expect(text).toContain("caused by:");
    expect(text).toContain("root cause");
  });

  it("appends an http status when present", () => {
    const err = Object.assign(new Error("http fail"), { status: 503 });
    expect(describeError(err)).toContain("(status 503)");
  });

  it("stringifies non-Error values", () => {
    expect(describeError("just a string")).toContain("just a string");
    expect(describeError({ code: 42 })).toContain("42");
  });
});

describe("consumeLastCapturedError", () => {
  it("records an Error logged via console.error and returns it once", () => {
    const err = new Error(`captured ${Math.random().toString(36).slice(2)}`);
    // error-capture.ts wraps console.error to record Error-like args.
    console.error(err);

    const first = consumeLastCapturedError();
    expect(first).toBe(err);
    // Consuming is one-shot.
    expect(consumeLastCapturedError()).toBeUndefined();
  });
});
