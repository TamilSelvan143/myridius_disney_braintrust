import { describe, expect, it } from "vitest";

import { readFileForAiAnalysis } from "@/lib/ai-document-read";

// This jsdom/node environment does not implement Blob.prototype.text(), and
// File.size is a getter-only property. readFileForAiAnalysis only reads
// name/type/size/text(), so we pass a minimal File-like object (cast to File)
// to exercise the module's branching logic (text vs pdf vs binary).
function file(name: string, body: string, type: string): File {
  return {
    name,
    type,
    size: body.length,
    text: async () => body,
  } as unknown as File;
}

describe("readFileForAiAnalysis", () => {
  it("reads text/* files as-is", async () => {
    const payload = await readFileForAiAnalysis(
      file("brief.txt", "Section 1\nLimit $5000.", "text/plain"),
    );
    expect(payload.name).toBe("brief.txt");
    expect(payload.mimeType).toBe("text/plain");
    expect(payload.content).toContain("Limit $5000.");
  });

  it("reads .csv/.txt by extension even without a mime type", async () => {
    const payload = await readFileForAiAnalysis(file("data.csv", "a,b,c\n1,2,3", ""));
    expect(payload.mimeType).toBe("application/octet-stream");
    expect(payload.content).toContain("a,b,c");
  });

  it("does not extract PDF text in-browser, but keeps the filename", async () => {
    const payload = await readFileForAiAnalysis(
      file("report.pdf", "%PDF-1.7 binary", "application/pdf"),
    );
    expect(payload.content).toContain("report.pdf");
    expect(payload.content).toContain("Text not extracted in-browser");
  });

  it("detects PDF by extension when mime type is missing", async () => {
    const payload = await readFileForAiAnalysis(file("report.PDF", "%PDF binary", ""));
    expect(payload.content).toContain("Text not extracted in-browser");
  });

  it("treats mostly-text unknown files as readable text", async () => {
    const prose = "This is a long enough prose document with plenty of readable characters in it.";
    const payload = await readFileForAiAnalysis(
      file("notes.log", prose, "application/octet-stream"),
    );
    expect(payload.content).toContain(prose);
  });

  it("falls back to a binary placeholder for control-character content", async () => {
    const binary = `binary\u0000\u0001\u0002${"x".repeat(60)}`;
    const payload = await readFileForAiAnalysis(
      file("blob.bin", binary, "application/octet-stream"),
    );
    expect(payload.content).toContain("Binary attachment");
    expect(payload.content).toContain("blob.bin");
  });

  it("truncates very large text content to 50k characters", async () => {
    const big = "a".repeat(60_000);
    const payload = await readFileForAiAnalysis(file("big.txt", big, "text/plain"));
    expect(payload.content.length).toBe(50_000);
  });
});
