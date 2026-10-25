import type { AiDocumentPayload } from "@/lib/ai-document-read";

export type PendingAssessmentPayload = {
  assessmentId: string;
  title: string;
  owner: string;
  changeType: string;
  changeSummary: string;
  documents: AiDocumentPayload[];
};

const key = "risk-workbench-pending-ai";

export function savePendingAssessment(payload: PendingAssessmentPayload) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(key, JSON.stringify(payload));
}

export function loadPendingAssessment(): PendingAssessmentPayload | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingAssessmentPayload;
  } catch {
    return null;
  }
}
