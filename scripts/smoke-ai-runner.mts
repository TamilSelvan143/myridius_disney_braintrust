console.error("[smoke-ai] starting…");

import { loadEnv } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(root, "..");

const envFromFile = loadEnv("development", projectRoot, "");
for (const [key, value] of Object.entries(envFromFile)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}

const { demoDocumentsAsAiPayload } = await import("../src/data/demo-documents.ts");
const { performAssessmentAnalysis } = await import("../src/fns/assessment-ai.ts");

const docs = demoDocumentsAsAiPayload().slice(0, 1);
const t0 = Date.now();

try {
  const r = await performAssessmentAnalysis({
    assessmentId: "RA-2304",
    title: "Corporate card controls refresh",
    changeType: "New product",
    owner: "A. Mensah",
    changeSummary: "New corporate card spending rules and merchant restrictions.",
    documents: docs,
  });
  console.log(
    JSON.stringify({
      ok: true,
      ms: Date.now() - t0,
      model: r.model,
      facts: r.facts.length,
      findings: r.findings.length,
      summaryLen: r.requestSummary.length,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({ ok: false, ms: Date.now() - t0, error: error instanceof Error ? error.message : String(error) }),
  );
  process.exit(1);
}
