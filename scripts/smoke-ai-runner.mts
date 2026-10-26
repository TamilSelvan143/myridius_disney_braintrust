console.error("[smoke-ai] starting…");

import { createServer, loadEnv } from "vite";
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

const vite = await createServer({
  configFile: path.join(projectRoot, "vite.config.ts"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

const mod = await vite.ssrLoadModule("/src/fns/assessment-ai.ts");
const { demoDocumentsAsAiPayload } = await vite.ssrLoadModule("/src/data/demo-documents.ts");

const analyze = mod.analyzeAssessmentWithAi as {
  __executeServer?: (opts: { data: unknown; method?: string }) => Promise<{ result?: unknown; error?: Error }>;
};

if (!analyze.__executeServer) {
  console.error(JSON.stringify({ ok: false, error: "Server handler not available (expected SSR bundle)" }));
  process.exit(1);
}

const docs = demoDocumentsAsAiPayload().slice(0, 1);
const t0 = Date.now();

const { result, error } = await analyze.__executeServer({
  method: "POST",
  data: {
    assessmentId: "RA-2304",
    title: "Corporate card controls refresh",
    changeType: "New product",
    owner: "A. Mensah",
    changeSummary: "New corporate card spending rules and merchant restrictions.",
    documents: docs,
  },
});

await vite.close();

if (error) {
  console.error(JSON.stringify({ ok: false, ms: Date.now() - t0, error: error.message }));
  process.exit(1);
}

const r = result as {
  model: string;
  facts: unknown[];
  findings: unknown[];
  requestSummary: string;
};

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
