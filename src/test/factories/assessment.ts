// Dynamic test-data factories.
//
// Tests must NOT hardcode seed values (RA-2304, "Daniela", "A. Mensah", …): the
// app's seed data and its hosting domain are both expected to change. Every test
// that needs an assessment, a submitted record, a stage, or an AI result builds it
// here with randomized-but-valid fields and asserts on the values it generated — so
// the suite survives seed changes and the move to a custom domain.

import type { SubmittedAssessmentRecord } from "@/lib/submitted-assessments-storage";
import type { StoredAssessmentStage } from "@/lib/assessment-stage-storage";
import type { AiAnalysisResult, AiFact, AiFinding } from "@/fns/assessment-ai";
import type { AiDocumentPayload } from "@/lib/ai-document-read";

/** The four governed risk levels (mirrors RiskLevel in src/data/governance.ts). */
export const RISK_LEVELS = ["Critical", "High", "Medium", "Low"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** The three governed control-effectiveness ratings. */
export const EFFECTIVENESS = ["Strong", "Moderate", "Weak"] as const;
export type ControlEffectiveness = (typeof EFFECTIVENESS)[number];

/** Every workflow stage the app understands (mirrors StoredAssessmentStage). */
export const STAGES: StoredAssessmentStage[] = [
  "Uploaded",
  "AI analysis",
  "Analyst review",
  "Needs information",
  "Committee",
  "Decision",
];

const CHANGE_TYPES = [
  "New product",
  "New geography",
  "New channel",
  "Vendor onboarding",
  "Limit change",
  "Policy change",
] as const;

// Deterministic-but-varied pseudo-random so a failing test is reproducible from the
// seed printed in its generated id. Not security-sensitive — only for test fixtures.
let seedCounter = Math.floor(Math.random() * 1_000);

function nextSeed(): number {
  seedCounter = (seedCounter * 1_103_515_245 + 12_345) & 0x7fffffff;
  return seedCounter;
}

function pick<T>(items: readonly T[]): T {
  return items[nextSeed() % items.length]!;
}

function randomInt(min: number, max: number): number {
  return min + (nextSeed() % (max - min + 1));
}

function randomWord(prefix: string): string {
  return `${prefix}-${nextSeed().toString(36)}`;
}

/**
 * A generated reference id in the app's RA-#### shape, above the seed range
 * (the app seeds below 2300; see src/lib/assessment-id.ts). Unique per call.
 */
export function makeAssessmentId(): string {
  return `RA-${randomInt(5000, 8999)}`;
}

/** A generated person/team name — never a hardcoded seed owner. */
export function makeOwner(): string {
  const initials = String.fromCharCode(65 + randomInt(0, 25));
  const surnames = ["Okafor", "Nguyen", "Ibarra", "Haddad", "Rossi", "Kowalski", "Tan"];
  return `${initials}. ${pick(surnames)}`;
}

/** The Assessment shape rendered by the workbench table (src/components/risk-guardian.tsx). */
export type AssessmentLike = {
  id: string;
  title: string;
  risk: RiskLevel;
  stage: StoredAssessmentStage;
  due: string;
  owner: string;
  summary: string;
  file: string;
  progress: number;
};

/** Build one assessment row with valid, randomized fields. Override any field. */
export function makeAssessment(overrides: Partial<AssessmentLike> = {}): AssessmentLike {
  const id = overrides.id ?? makeAssessmentId();
  return {
    id,
    title: `${pick(CHANGE_TYPES)} ${randomWord("review")}`,
    risk: pick(RISK_LEVELS),
    stage: pick(STAGES),
    due: `${randomInt(1, 28)} Oct`,
    owner: makeOwner(),
    summary: `Automated fixture summary for ${id} ${randomWord("ctx")} describing a change.`,
    file: `${randomWord("brief")}.pdf`,
    progress: randomInt(0, 4),
    ...overrides,
  };
}

/** Build N distinct assessments. */
export function makeAssessments(
  count: number,
  overrides: Partial<AssessmentLike> = {},
): AssessmentLike[] {
  return Array.from({ length: count }, () => makeAssessment(overrides));
}

/** Build a submitted-assessment storage record with randomized fields. */
export function makeSubmittedRecord(
  overrides: Partial<SubmittedAssessmentRecord> = {},
): SubmittedAssessmentRecord {
  const id = overrides.id ?? makeAssessmentId();
  return {
    id,
    title: `${pick(CHANGE_TYPES)} ${randomWord("title")}`,
    owner: makeOwner(),
    changeType: pick(CHANGE_TYPES),
    changeSummary: `Fixture change summary ${randomWord("sum")} for ${id}.`,
    file: `${randomWord("doc")}.docx`,
    ...overrides,
  };
}

/** Build an in-browser document payload (as src/lib/ai-document-read.ts produces). */
export function makeDocumentPayload(overrides: Partial<AiDocumentPayload> = {}): AiDocumentPayload {
  return {
    name: `${randomWord("source")}.txt`,
    mimeType: "text/plain",
    content: `Section 1\n${randomWord("fact")} limit $${randomInt(1000, 50000)}.`,
    ...overrides,
  };
}

/** Build a valid analyze-input payload (matches analyzeInput in src/fns/assessment-ai.ts). */
export function makeAnalyzeInput(
  overrides: Partial<{
    assessmentId: string;
    title: string;
    changeType: string;
    owner: string;
    changeSummary: string;
    documents: AiDocumentPayload[];
  }> = {},
) {
  const id = overrides.assessmentId ?? makeAssessmentId();
  return {
    assessmentId: id,
    title: `${pick(CHANGE_TYPES)} ${randomWord("title")}`,
    changeType: pick(CHANGE_TYPES),
    owner: makeOwner(),
    changeSummary: `Fixture change summary for ${id} ${randomWord("sum")} over 20 chars.`,
    documents: [makeDocumentPayload()],
    ...overrides,
  };
}

/** Build a valid AI fact. */
export function makeAiFact(overrides: Partial<AiFact> = {}): AiFact {
  return {
    label: randomWord("Label"),
    value: randomWord("value"),
    confidence: (randomInt(50, 99) / 100).toFixed(2),
    source: `doc §${randomInt(1, 9)}.${randomInt(1, 9)}`,
    ...overrides,
  };
}

/** Build a valid AI finding. */
export function makeAiFinding(overrides: Partial<AiFinding> = {}): AiFinding {
  return {
    name: randomWord("factor"),
    score: randomInt(1, 100),
    level: pick(RISK_LEVELS),
    eff: pick(EFFECTIVENESS),
    owner: makeOwner(),
    reason: `Fixture reasoning ${randomWord("r")}.`,
    evidence: `Applicant doc §${randomInt(1, 9)} — ${randomWord("quote")}.`,
    framework: `Policy ${randomWord("fw")}`,
    controls: [randomWord("control"), randomWord("control")],
    control: `Recommended control ${randomWord("c")}.`,
    ...overrides,
  };
}

/**
 * Build a complete AI analysis result (as AiAnalysisResult). Defaults satisfy the
 * app's expectations: >=3 facts and the shape persisted by ai-analysis-storage.
 */
export function makeAiAnalysisResult(overrides: Partial<AiAnalysisResult> = {}): AiAnalysisResult {
  return {
    requestSummary: `Fixture request summary ${randomWord("s")} long enough for validation.`,
    facts: [makeAiFact(), makeAiFact(), makeAiFact()],
    findings: [makeAiFinding()],
    model: `test:${randomWord("model")}`,
    generatedAt: new Date().toISOString(),
    ...overrides,
  };
}
