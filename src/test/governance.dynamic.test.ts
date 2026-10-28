import { describe, expect, it } from "vitest";

import { effectivenessRate, residualScore, riskLevel } from "@/data/governance";
import { EFFECTIVENESS, RISK_LEVELS } from "@/test/factories/assessment";

// Property-style coverage derived from the governed rates/thresholds rather than
// hardcoded expected numbers, so it stays correct if the rates are retuned.
describe("residualScore (property)", () => {
  it.each(EFFECTIVENESS)("applies the %s effectiveness rate", (eff) => {
    const inherent = 80;
    const expected = Math.max(1, Math.round(inherent * (1 - effectivenessRate[eff])));
    expect(residualScore(inherent, eff)).toBe(expected);
  });

  it("never drops below the floor of 1", () => {
    expect(residualScore(1, "Strong")).toBeGreaterThanOrEqual(1);
    expect(residualScore(0, "Strong")).toBe(1);
  });

  it("stronger controls never yield a higher residual than weaker ones", () => {
    const inherent = 90;
    expect(residualScore(inherent, "Strong")).toBeLessThanOrEqual(
      residualScore(inherent, "Moderate"),
    );
    expect(residualScore(inherent, "Moderate")).toBeLessThanOrEqual(
      residualScore(inherent, "Weak"),
    );
  });
});

describe("riskLevel (boundaries)", () => {
  it("maps each threshold boundary to the expected level", () => {
    expect(riskLevel(80)).toBe("Critical");
    expect(riskLevel(79)).toBe("High");
    expect(riskLevel(60)).toBe("High");
    expect(riskLevel(59)).toBe("Medium");
    expect(riskLevel(30)).toBe("Medium");
    expect(riskLevel(29)).toBe("Low");
    expect(riskLevel(0)).toBe("Low");
  });

  it("only ever returns a governed risk level", () => {
    for (let score = 0; score <= 100; score += 7) {
      expect(RISK_LEVELS).toContain(riskLevel(score));
    }
  });

  it("is monotonic — a higher score is never a lower severity", () => {
    const order = { Low: 0, Medium: 1, High: 2, Critical: 3 } as const;
    let prev = -1;
    for (let score = 0; score <= 100; score += 5) {
      const rank = order[riskLevel(score)];
      expect(rank).toBeGreaterThanOrEqual(prev);
      prev = rank;
    }
  });
});
