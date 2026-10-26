/**
 * End-to-end assessment analysis (no TanStack server-fn runtime). Requires .env keys.
 */
import { loadEnv } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(fileURLToPath(import.meta.url), "..", "..");
for (const [k, v] of Object.entries(loadEnv("development", root, ""))) {
  if (process.env[k] === undefined) process.env[k] = v;
}

const { demoDocumentsAsAiPayload } = await import("../src/data/demo-documents.ts");
const { performAssessmentAnalysis } = await import("../src/fns/assessment-ai.ts");

const t0 = Date.now();
try {
  const result = await performAssessmentAnalysis({
    assessmentId: "RA-2304",
    title: "Corporate card controls refresh",
    changeType: "New product",
    owner: "A. Mensah",
    changeSummary: "New corporate card spending rules and merchant restrictions for existing customers.",
    documents: demoDocumentsAsAiPayload().slice(0, 1),
  });
  console.log(
    JSON.stringify({
      ok: true,
      ms: Date.now() - t0,
      model: result.model,
      facts: result.facts.length,
      findings: result.findings.length,
    }),
  );
} catch (error) {
  console.error(JSON.stringify({ ok: false, ms: Date.now() - t0, error: String(error) }));
  process.exit(1);
}
