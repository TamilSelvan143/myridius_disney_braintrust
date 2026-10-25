import type { AiDocumentPayload } from "@/lib/ai-document-read";
import { registerSubmittedAssessment } from "@/lib/submitted-assessments-storage";

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
  registerSubmittedAssessment({
    id: payload.assessmentId,
    title: payload.title,
    owner: payload.owner,
    changeType: payload.changeType,
    changeSummary: payload.changeSummary,
    file: payload.documents[0]?.name ?? "uploaded-document",
  });
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
