import { describe, expect, it } from "vitest";
import { z } from "zod";

const analyzeInput = z.object({
  assessmentId: z.string().min(1).max(32),
  title: z.string().min(1).max(200),
  changeType: z.string().min(1).max(80),
  owner: z.string().min(1).max(120),
  changeSummary: z.string().min(1).max(4000),
  documents: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        mimeType: z.string().max(120),
        content: z.string().max(80_000),
      }),
    )
    .min(1)
    .max(10),
});

describe("assessment AI input validation", () => {
  it("accepts a minimal valid analyze payload", () => {
    const parsed = analyzeInput.parse({
      assessmentId: "RA-2304",
      title: "Corporate card controls refresh",
      changeType: "New product",
      owner: "A. Mensah",
      changeSummary: "New corporate card spending rules.",
      documents: [
        { name: "brief.pdf", mimeType: "text/plain", content: "Section 1\nLimit $5000." },
      ],
    });
    expect(parsed.documents).toHaveLength(1);
  });

  it("rejects empty documents", () => {
    expect(() =>
      analyzeInput.parse({
        assessmentId: "RA-2304",
        title: "T",
        changeType: "New product",
        owner: "Owner",
        changeSummary: "Summary",
        documents: [],
      }),
    ).toThrow();
  });
});
