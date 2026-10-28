import { describe, expect, it } from "vitest";

import { nextAssessmentId } from "@/lib/assessment-id";
import { makeAssessments } from "@/test/factories/assessment";

// Dynamic counterpart to the existing hardcoded assessment-id.test.ts: these
// assertions are derived from generated ids, not fixed seed references.
describe("nextAssessmentId (dynamic)", () => {
  it("returns one above the highest RA-#### among generated ids", () => {
    const rows = makeAssessments(8);
    const ids = rows.map((r) => r.id);
    const highest = Math.max(...ids.map((id) => Number.parseInt(id.replace("RA-", ""), 10)));

    expect(nextAssessmentId(ids)).toBe(`RA-${highest + 1}`);
  });

  it("ignores ids that do not match the RA-#### pattern", () => {
    expect(nextAssessmentId(["DRAFT", "RA-", "RA-5200", "not-an-id"])).toBe("RA-5201");
  });

  it("never returns an id at or below the seed floor", () => {
    const next = nextAssessmentId([]);
    const n = Number.parseInt(next.replace("RA-", ""), 10);
    expect(n).toBeGreaterThan(2300);
  });
});
