/**
 * Seeds RA-2310 from sample DOCX text and runs analyzeAssessmentWithAi (SSR).
 * Usage: export $(grep -E '^CURSOR_(API_KEY|MODEL)=' .env | xargs) && npx vite-node scripts/e2e-geography-flow.mts
 */
import { execSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const docxPath = join(root, "sample-uploads/geography-change-request-brief.docx");

const text = execSync(
  `python3 -c "from docx import Document; d=Document(r'${docxPath}'); print(chr(10).join(p.text for p in d.paragraphs if p.text.strip()))"`,
  { encoding: "utf8", maxBuffer: 2_000_000 },
).trim();

if (text.length < 100) {
  console.error(JSON.stringify({ ok: false, error: "DOCX text too short" }));
  process.exit(1);
}

const vite = await createServer({
  configFile: join(root, "vite.config.ts"),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

const mod = await vite.ssrLoadModule("/src/fns/assessment-ai.ts");
const analyze = mod.analyzeAssessmentWithAi as {
  __executeServer?: (opts: { data: unknown; method?: string }) => Promise<{ result?: unknown; error?: Error }>;
};

if (!analyze.__executeServer) {
  console.error(JSON.stringify({ ok: false, error: "SSR handler missing" }));
  process.exit(1);
}

const payload = {
  assessmentId: "RA-2310",
  title: "Mobile cross-border geography pilot (MX · NG)",
  changeType: "New geography",
  owner: "Product — Digital Banking",
  changeSummary:
    "Expand outbound retail remittance from the US to Mexico and Nigeria via mobile; daily limit up to USD 25,000 for eligible existing customers.",
  documents: [
    {
      name: "geography-change-request-brief.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      content: text.slice(0, 50_000),
    },
  ],
};

const t0 = Date.now();
const { result, error } = await analyze.__executeServer({ method: "POST", data: payload });
await vite.close();

if (error) {
  console.error(JSON.stringify({ ok: false, ms: Date.now() - t0, error: error.message }));
  process.exit(1);
}

const r = result as { model: string; facts: unknown[]; findings: unknown[]; requestSummary: string };
console.log(
  JSON.stringify({
    ok: true,
    ms: Date.now() - t0,
    model: r.model,
    facts: r.facts.length,
    findings: r.findings.length,
    summaryPreview: r.requestSummary.slice(0, 120),
  }),
);
