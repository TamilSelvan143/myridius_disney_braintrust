import { describe, expect, it } from "vitest";

import { nextAssessmentId } from "@/lib/assessment-id";

describe("nextAssessmentId", () => {
  it("increments from the highest existing RA reference", () => {
    expect(nextAssessmentId(["RA-2304", "RA-2291", "RA-2310"])).toBe("RA-2311");
  });

  it("starts above demo seed when none provided", () => {
    expect(nextAssessmentId([])).toBe("RA-2301");
  });
});
