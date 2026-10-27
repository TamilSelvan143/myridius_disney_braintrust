import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { policyCorpus, riskFactorTaxonomy } from "@/data/governance";
import { textFromCursorRun } from "@/lib/cursor-agent-text";

const documentSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.string().max(120),
  content: z.string().max(80_000),
});

const analyzeInput = z.object({
  assessmentId: z.string().min(1).max(32),
  title: z.string().min(1).max(200),
  changeType: z.string().min(1).max(80),
  owner: z.string().min(1).max(120),
  changeSummary: z.string().min(1).max(4000),
  documents: z.array(documentSchema).min(1).max(10),
});

const followUpInput = z.object({
  assessmentId: z.string().min(1).max(32),
  factorName: z.string().min(1).max(200),
  question: z.string().min(1).max(2000),
  analysisContext: z.object({
    requestSummary: z.string(),
    findings: z.array(
      z.object({
        name: z.string(),
        level: z.string(),
        score: z.number(),
        reason: z.string(),
        evidence: z.string(),
        framework: z.string(),
        control: z.string(),
      }),
    ),
  }),
});

export type AiFact = {
  label: string;
  value: string;
  confidence: string;
  source: string;
};

export type AiFinding = {
  name: string;
  score: number;
  level: "Critical" | "High" | "Medium" | "Low";
  eff: "Strong" | "Moderate" | "Weak";
  owner: string;
  reason: string;
  evidence: string;
  framework: string;
  controls: string[];
  control: string;
};

export type AiAnalysisResult = {
  requestSummary: string;
  facts: AiFact[];
  findings: AiFinding[];
  model: string;
  generatedAt: string;
};

type AnthropicContentBlock = { type: string; text?: string };

function envVar(name: string): string | undefined {
  return process.env[name];
}

function resolvedModelLabel(): string {
  if (envVar("CURSOR_API_KEY")) {
    return `cursor:${envVar("CURSOR_MODEL") ?? "claude-sonnet-4-6"}`;
  }
  return envVar("ANTHROPIC_MODEL") ?? "claude-sonnet-4-20250514";
}

async function callCursorJson(system: string, user: string): Promise<string> {
  const apiKey = envVar("CURSOR_API_KEY");
  if (!apiKey) {
    throw new Error("CURSOR_API_KEY is not set.");
  }

  const modelId = envVar("CURSOR_MODEL") ?? "claude-sonnet-4-6";
  const { Agent } = await import("@cursor/sdk");
  const agent = await Agent.create({
    apiKey,
    model: { id: modelId },
    cloud: { repos: [] },
  });

  try {
    const prompt = `[SYSTEM]\n${system}\n\n[USER]\n${user}\n\nRespond with JSON only, no markdown unless fenced.`;
    const run = await agent.send(prompt);
    return await textFromCursorRun(run);
  } finally {
    await agent.close();
  }
}

async function callAnthropicJson(system: string, user: string): Promise<string> {
  const apiKey = envVar("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("Set CURSOR_API_KEY or ANTHROPIC_API_KEY in .env for live AI analysis.");
  }

  const model = envVar("ANTHROPIC_MODEL") ?? "claude-sonnet-4-20250514";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.2,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${detail.slice(0, 400)}`);
  }

  const payload = (await response.json()) as {
    content?: AnthropicContentBlock[];
  };
  const text = payload.content?.find((b) => b.type === "text")?.text?.trim();
  if (!text) throw new Error("Anthropic returned an empty response.");
  return text;
}

async function callLlmJson(system: string, user: string): Promise<string> {
  if (envVar("CURSOR_API_KEY")) {
    return callCursorJson(system, user);
  }
  return callAnthropicJson(system, user);
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? text.trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("AI response did not contain valid JSON.");
  }
}

const analysisJsonSchema = z.object({
  requestSummary: z.string().min(20).max(2000),
  facts: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        confidence: z.string(),
        source: z.string(),
      }),
    )
    .min(3)
    .max(12),
  findings: z
    .array(
      z.object({
        name: z.string(),
        score: z.number().min(1).max(100),
        level: z.enum(["Critical", "High", "Medium", "Low"]),
        eff: z.enum(["Strong", "Moderate", "Weak"]),
        owner: z.string(),
        reason: z.string(),
        evidence: z.string(),
        framework: z.string(),
        controls: z.array(z.string()).min(1).max(6),
        control: z.string(),
      }),
    )
    .min(3)
    .max(8),
});

function buildAnalysisSystemPrompt(): string {
  const taxonomy = riskFactorTaxonomy.map((t) => `- ${t.name}`).join("\n");
  const policies = policyCorpus
    .slice(0, 8)
    .map((p) => `- ${p.id}: ${p.rule} (${p.source})`)
    .join("\n");
  return `You are the Extraction + Drafting agent for a bank financial-crime risk assessment workbench.
You ONLY propose draft facts and risk findings from supplied documents and approved policy references.
You NEVER compute final residual scores — inherent scores are drafts for human review.
Return ONLY valid JSON matching the schema described in the user message.
Use these governed risk factor names when possible:
${taxonomy}
Approved policy corpus (cite by id/name in framework fields):
${policies}
Every finding must include evidence quoting or paraphrasing an uploaded document with section/page style citation.
Do not invent facts not supported by the documents or the change summary.`;
}

export async function performAssessmentAnalysis(
  data: z.infer<typeof analyzeInput>,
): Promise<AiAnalysisResult> {
  const docBlock = data.documents
    .map(
      (d, i) =>
        `--- Document ${i + 1}: ${d.name} (${d.mimeType}) ---\n${d.content.slice(0, 12_000)}`,
    )
    .join("\n\n");

  const userPrompt = `Assessment ${data.assessmentId}
Title: ${data.title}
Change type: ${data.changeType}
Owner: ${data.owner}
Change summary: ${data.changeSummary}

Source documents:
${docBlock}

Respond with JSON only:
{
  "requestSummary": "2-4 sentences for executives",
  "facts": [{ "label": "...", "value": "...", "confidence": "0.00-1.00", "source": "doc §..." }],
  "findings": [{
    "name": "factor name from taxonomy",
    "score": 1-100,
    "level": "Critical|High|Medium|Low",
    "eff": "Strong|Moderate|Weak",
    "owner": "team name",
    "reason": "AI reasoning prose",
    "evidence": "Applicant doc citation",
    "framework": "Regulatory / policy citation",
    "controls": ["control 1", "control 2"],
    "control": "primary recommended control sentence"
  }]
}`;

  const raw = await callLlmJson(buildAnalysisSystemPrompt(), userPrompt);
  const parsed = analysisJsonSchema.parse(extractJsonObject(raw));
  const model = resolvedModelLabel();

  return {
    ...parsed,
    model,
    generatedAt: new Date().toISOString(),
  };
}

export const analyzeAssessmentWithAi = createServerFn({ method: "POST" })
  .validator((data: unknown) => analyzeInput.parse(data))
  .handler(async ({ data }) => performAssessmentAnalysis(data));

export const askAssessmentFollowUp = createServerFn({ method: "POST" })
  .validator((data: unknown) => followUpInput.parse(data))
  .handler(async ({ data }) => {
    const finding = data.analysisContext.findings.find((f) => f.name === data.factorName);
    if (!finding) {
      throw new Error(`Unknown factor: ${data.factorName}`);
    }

    const system = `You are a source-grounded analyst assistant. Answer ONLY from the provided assessment context and uploaded-evidence citations. If the question cannot be answered from sources, say so. Keep answers under 120 words. Return JSON: {"answer":"...","cites":["citation 1","citation 2"]}`;

    const user = `Assessment ${data.assessmentId}
Request summary: ${data.analysisContext.requestSummary}
Factor: ${finding.name}
Level: ${finding.level} (${finding.score})
Reason: ${finding.reason}
Evidence: ${finding.evidence}
Framework: ${finding.framework}
Recommended control: ${finding.control}

Question: ${data.question}`;

    const raw = await callLlmJson(system, user);
    const parsed = z
      .object({
        answer: z.string().min(1).max(1500),
        cites: z.array(z.string()).max(6),
      })
      .parse(extractJsonObject(raw));

    return {
      ...parsed,
      model: resolvedModelLabel(),
    };
  });

export const rerunFindingWithAi = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        assessmentId: z.string(),
        factorName: z.string(),
        analystNote: z.string().min(8).max(2000),
        analysisContext: followUpInput.shape.analysisContext,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const finding = data.analysisContext.findings.find((f) => f.name === data.factorName);
    if (!finding) throw new Error(`Unknown factor: ${data.factorName}`);

    const system = `You are re-reviewing ONE draft risk finding after analyst feedback. Return JSON only:
{"level":"Critical|High|Medium|Low","score":1-100,"reason":"updated AI reasoning","summary":"one sentence for audit log"}`;

    const user = `Factor: ${finding.name}
Current draft: ${finding.level} / ${finding.score}
Original reason: ${finding.reason}
Evidence: ${finding.evidence}
Analyst note to reconsider: ${data.analystNote}`;

    const raw = await callLlmJson(system, user);
    const parsed = z
      .object({
        level: z.enum(["Critical", "High", "Medium", "Low"]),
        score: z.number().min(1).max(100),
        reason: z.string(),
        summary: z.string(),
      })
      .parse(extractJsonObject(raw));

    return parsed;
  });
