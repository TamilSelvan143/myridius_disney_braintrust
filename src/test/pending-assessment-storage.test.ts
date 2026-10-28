import { afterEach, describe, expect, it } from "vitest";

import {
  clearPendingAssessment,
  loadPendingAssessment,
  savePendingAssessment,
} from "@/lib/pending-assessment-storage";
import { loadSubmittedAssessments } from "@/lib/submitted-assessments-storage";
import { makeAnalyzeInput } from "@/test/factories/assessment";

afterEach(() => {
  sessionStorage.clear();
});

describe("pending assessment storage", () => {
  it("round-trips a saved pending payload", () => {
    const input = makeAnalyzeInput();
    savePendingAssessment(input);

    const loaded = loadPendingAssessment();
    expect(loaded).not.toBeNull();
    expect(loaded!.assessmentId).toBe(input.assessmentId);
    expect(loaded!.title).toBe(input.title);
    expect(loaded!.documents).toHaveLength(input.documents.length);
  });

  it("also registers the assessment as submitted when saved", () => {
    const input = makeAnalyzeInput();
    savePendingAssessment(input);

    const submitted = loadSubmittedAssessments();
    expect(submitted.map((r) => r.id)).toContain(input.assessmentId);
    expect(submitted.find((r) => r.id === input.assessmentId)!.file).toBe(input.documents[0]!.name);
  });

  it("falls back to a placeholder filename when no documents are attached", () => {
    const input = makeAnalyzeInput({ documents: [] });
    savePendingAssessment(input);

    const record = loadSubmittedAssessments().find((r) => r.id === input.assessmentId);
    expect(record!.file).toBe("uploaded-document");
  });

  it("returns null after the pending payload is cleared", () => {
    savePendingAssessment(makeAnalyzeInput());
    clearPendingAssessment();
    expect(loadPendingAssessment()).toBeNull();
  });

  it("returns null when stored JSON is corrupt", () => {
    sessionStorage.setItem("risk-workbench-pending-ai", "{not json");
    expect(loadPendingAssessment()).toBeNull();
  });
});
