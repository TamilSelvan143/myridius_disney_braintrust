import { describe, expect, it } from "vitest";

import { demoDocumentsAsAiPayload } from "@/data/demo-documents";
import { residualScore, riskLevel } from "@/data/governance";

describe("governance scoring", () => {
  it("computes residual scores from effectiveness rates", () => {
    expect(residualScore(80, "Strong")).toBe(32);
    expect(residualScore(80, "Moderate")).toBe(48);
    expect(residualScore(80, "Weak")).toBe(68);
  });

  it("maps scores to risk levels", () => {
    expect(riskLevel(85)).toBe("Critical");
    expect(riskLevel(70)).toBe("High");
    expect(riskLevel(45)).toBe("Medium");
    expect(riskLevel(10)).toBe("Low");
  });
});

describe("demo document payload", () => {
  it("builds non-empty AI payloads for demo assessments", () => {
    const docs = demoDocumentsAsAiPayload();
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.every((d) => d.content.trim().length > 20)).toBe(true);
  });
});
