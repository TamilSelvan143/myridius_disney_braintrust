import { afterEach, describe, expect, it } from "vitest";

import { loadAiAnalysis } from "@/lib/ai-analysis-storage";
import {
  loadAssessmentStage,
  saveAssessmentStage,
} from "@/lib/assessment-stage-storage";

afterEach(() => {
  sessionStorage.removeItem("risk-workbench-stage");
  sessionStorage.removeItem("risk-workbench-ai:RA-2310");
});

describe("assessment stage storage", () => {
  it("persists workflow stage per assessment id", () => {
    saveAssessmentStage("RA-2310", "Analyst review");
    expect(loadAssessmentStage("RA-2310")).toBe("Analyst review");
  });
});

describe("ai + stage pairing", () => {
  it("allows restoring analyst review when ai result exists", () => {
    sessionStorage.setItem(
      "risk-workbench-ai:RA-2310",
      JSON.stringify({
        requestSummary: "Summary long enough for test validation.",
        facts: [
          { label: "A", value: "B", confidence: "0.9", source: "§1" },
          { label: "C", value: "D", confidence: "0.9", source: "§2" },
          { label: "E", value: "F", confidence: "0.9", source: "§3" },
        ],
        findings: [],
        model: "cursor:test",
        generatedAt: new Date().toISOString(),
      }),
    );
    expect(loadAiAnalysis("RA-2310")).not.toBeNull();
    saveAssessmentStage("RA-2310", "Analyst review");
    expect(loadAssessmentStage("RA-2310")).toBe("Analyst review");
  });
});
