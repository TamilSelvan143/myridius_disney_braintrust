import { afterEach, describe, expect, it } from "vitest";

import { clearAiAnalysis, loadAiAnalysis, saveAiAnalysis } from "@/lib/ai-analysis-storage";
import { makeAiAnalysisResult, makeAssessmentId } from "@/test/factories/assessment";

afterEach(() => {
  sessionStorage.clear();
});

describe("ai analysis storage", () => {
  it("round-trips an analysis result per assessment id", () => {
    const id = makeAssessmentId();
    const result = makeAiAnalysisResult();
    saveAiAnalysis(id, result);

    const loaded = loadAiAnalysis(id);
    expect(loaded).not.toBeNull();
    expect(loaded!.requestSummary).toBe(result.requestSummary);
    expect(loaded!.facts).toHaveLength(result.facts.length);
    expect(loaded!.model).toBe(result.model);
  });

  it("isolates results by assessment id", () => {
    const a = makeAssessmentId();
    const b = makeAssessmentId();
    saveAiAnalysis(a, makeAiAnalysisResult());
    expect(loadAiAnalysis(a)).not.toBeNull();
    expect(loadAiAnalysis(b)).toBeNull();
  });

  it("returns null after clearing", () => {
    const id = makeAssessmentId();
    saveAiAnalysis(id, makeAiAnalysisResult());
    clearAiAnalysis(id);
    expect(loadAiAnalysis(id)).toBeNull();
  });

  it("returns null when stored JSON is corrupt", () => {
    const id = makeAssessmentId();
    sessionStorage.setItem(`risk-workbench-ai:${id}`, "{broken");
    expect(loadAiAnalysis(id)).toBeNull();
  });
});
