import type { AiAnalysisResult } from "@/fns/assessment-ai";

const prefix = "risk-workbench-ai:";

export function saveAiAnalysis(assessmentId: string, result: AiAnalysisResult) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(`${prefix}${assessmentId}`, JSON.stringify(result));
}

export function loadAiAnalysis(assessmentId: string): AiAnalysisResult | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(`${prefix}${assessmentId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AiAnalysisResult;
  } catch {
    return null;
  }
}

export function clearAiAnalysis(assessmentId: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(`${prefix}${assessmentId}`);
}
