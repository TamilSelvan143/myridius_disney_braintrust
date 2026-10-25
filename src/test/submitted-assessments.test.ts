import { afterEach, describe, expect, it } from "vitest";

import {
  loadSubmittedAssessments,
  registerSubmittedAssessment,
} from "@/lib/submitted-assessments-storage";

const storageKey = "risk-workbench-submitted";

afterEach(() => {
  sessionStorage.removeItem(storageKey);
});

describe("submitted assessments storage", () => {
  it("dedupes registration for the same record", () => {
    const record = {
      id: "RA-2310",
      title: "Geography pilot",
      owner: "PO Team",
      changeType: "New geography",
      changeSummary: "US to MX and NG corridors.",
      file: "geography-change-request-brief.docx",
    };
    registerSubmittedAssessment(record);
    registerSubmittedAssessment(record);
    expect(loadSubmittedAssessments()).toHaveLength(1);
  });
});
