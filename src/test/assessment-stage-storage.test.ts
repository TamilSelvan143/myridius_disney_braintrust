import { afterEach, describe, expect, it, vi } from "vitest";

import {
  loadAssessmentStage,
  removeAssessmentStage,
  saveAssessmentStage,
  subscribeAssessmentStages,
} from "@/lib/assessment-stage-storage";
import { makeAssessmentId, STAGES } from "@/test/factories/assessment";

afterEach(() => {
  sessionStorage.clear();
});

describe("assessment stage storage (full)", () => {
  it("returns null for an unknown assessment", () => {
    expect(loadAssessmentStage(makeAssessmentId())).toBeNull();
  });

  it("persists and isolates stages per assessment id", () => {
    const a = makeAssessmentId();
    const b = makeAssessmentId();
    saveAssessmentStage(a, "Committee");
    saveAssessmentStage(b, "Decision");
    expect(loadAssessmentStage(a)).toBe("Committee");
    expect(loadAssessmentStage(b)).toBe("Decision");
  });

  it.each(STAGES)("round-trips the %s stage", (stage) => {
    const id = makeAssessmentId();
    saveAssessmentStage(id, stage);
    expect(loadAssessmentStage(id)).toBe(stage);
  });

  it("removes a stage", () => {
    const id = makeAssessmentId();
    saveAssessmentStage(id, "Analyst review");
    removeAssessmentStage(id);
    expect(loadAssessmentStage(id)).toBeNull();
  });

  it("notifies subscribers on change and stops after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAssessmentStages(listener);
    const id = makeAssessmentId();

    saveAssessmentStage(id, "Uploaded");
    expect(listener).toHaveBeenCalledTimes(1);

    // Writing the identical value must not re-notify (dedupe).
    saveAssessmentStage(id, "Uploaded");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    saveAssessmentStage(id, "Decision");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("recovers from corrupt stored JSON", () => {
    sessionStorage.setItem("risk-workbench-stage", "{broken");
    const id = makeAssessmentId();
    expect(loadAssessmentStage(id)).toBeNull();
    // And a subsequent save still works.
    saveAssessmentStage(id, "Committee");
    expect(loadAssessmentStage(id)).toBe("Committee");
  });
});
