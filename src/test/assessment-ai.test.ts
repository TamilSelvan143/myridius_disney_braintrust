import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { performAssessmentAnalysis } from "@/fns/assessment-ai";
import { makeAiFinding, makeAnalyzeInput } from "@/test/factories/assessment";

// performAssessmentAnalysis routes to the Anthropic REST path when only
// ANTHROPIC_API_KEY is set (Cursor path requires the @cursor/sdk + CURSOR_API_KEY).
// We mock global fetch so no network/live key is needed, and assert the
// prompt→parse→shape contract the UI depends on.

const ENV_KEYS = [
  "CURSOR_API_KEY",
  "CURSOR_MODEL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
] as const;
const savedEnv: Record<string, string | undefined> = {};

function anthropicText(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ content: [{ type: "text", text: JSON.stringify(body) }] }),
    text: async () => "",
  } as Response;
}

/** A schema-valid analysis body the model would return (>=3 facts, >=3 findings). */
function validAnalysisBody() {
  const finding = makeAiFinding();
  return {
    requestSummary: "A sufficiently long executive summary of the proposed change for review.",
    facts: [
      { label: "L1", value: "V1", confidence: "0.90", source: "doc §1" },
      { label: "L2", value: "V2", confidence: "0.80", source: "doc §2" },
      { label: "L3", value: "V3", confidence: "0.70", source: "doc §3" },
    ],
    findings: [
      { ...finding, score: 50 },
      { ...makeAiFinding(), score: 60 },
      { ...makeAiFinding(), score: 40 },
    ],
  };
}

beforeEach(() => {
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("performAssessmentAnalysis", () => {
  it("throws a configuration error when no AI key is set", async () => {
    await expect(performAssessmentAnalysis(makeAnalyzeInput())).rejects.toThrow(
      /CURSOR_API_KEY or ANTHROPIC_API_KEY/,
    );
  });

  it("returns a parsed analysis with the resolved model and a timestamp", async () => {
    process.env["ANTHROPIC_API_KEY"] = "test-key";
    process.env["ANTHROPIC_MODEL"] = "claude-test-model";
    const body = validAnalysisBody();
    const fetchMock = vi.fn().mockResolvedValue(anthropicText(body));
    vi.stubGlobal("fetch", fetchMock);

    const result = await performAssessmentAnalysis(makeAnalyzeInput());

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]![0]).toContain("api.anthropic.com");
    expect(result.requestSummary).toBe(body.requestSummary);
    expect(result.facts).toHaveLength(3);
    expect(result.findings).toHaveLength(3);
    expect(result.model).toBe("claude-test-model");
    expect(() => new Date(result.generatedAt).toISOString()).not.toThrow();
  });

  it("unwraps a fenced ```json code block from the model", async () => {
    process.env["ANTHROPIC_API_KEY"] = "test-key";
    const body = validAnalysisBody();
    const fenced = "Here is the analysis:\n```json\n" + JSON.stringify(body) + "\n```";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ content: [{ type: "text", text: fenced }] }),
        text: async () => "",
      } as Response),
    );

    const result = await performAssessmentAnalysis(makeAnalyzeInput());
    expect(result.requestSummary).toBe(body.requestSummary);
  });

  it("rejects when the model returns no valid JSON", async () => {
    process.env["ANTHROPIC_API_KEY"] = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ content: [{ type: "text", text: "not json at all" }] }),
        text: async () => "",
      } as Response),
    );

    await expect(performAssessmentAnalysis(makeAnalyzeInput())).rejects.toThrow(/valid JSON/);
  });

  it("rejects when the model JSON violates the analysis schema", async () => {
    process.env["ANTHROPIC_API_KEY"] = "test-key";
    // Only one fact — schema requires at least three.
    const bad = { requestSummary: "short summary over twenty chars long", facts: [], findings: [] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(anthropicText(bad)));

    await expect(performAssessmentAnalysis(makeAnalyzeInput())).rejects.toThrow();
  });

  it("surfaces an Anthropic API error status", async () => {
    process.env["ANTHROPIC_API_KEY"] = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({}),
        text: async () => "rate limited",
      } as Response),
    );

    await expect(performAssessmentAnalysis(makeAnalyzeInput())).rejects.toThrow(/429/);
  });
});
