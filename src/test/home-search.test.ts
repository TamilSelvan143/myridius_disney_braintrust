import { describe, expect, it } from "vitest";

import { homeSearchSchema } from "@/lib/home-search";

describe("homeSearchSchema", () => {
  it("accepts an empty search (dashboard default)", () => {
    expect(homeSearchSchema.parse({})).toEqual({});
  });

  it.each(["dashboard", "list", "committee", "audit", "policies", "requests"] as const)(
    "accepts the %s view",
    (view) => {
      expect(homeSearchSchema.parse({ view })).toEqual({ view });
    },
  );

  it("rejects an unknown view", () => {
    expect(() => homeSearchSchema.parse({ view: "nope" })).toThrow();
  });
});
