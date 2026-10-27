export type StoredAssessmentStage =
  "Uploaded" | "AI analysis" | "Analyst review" | "Needs information" | "Committee" | "Decision";

const key = "risk-workbench-stage";

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeAssessmentStages(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function readAll(): Record<string, StoredAssessmentStage> {
  if (typeof sessionStorage === "undefined") return {};
  const raw = sessionStorage.getItem(key);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, StoredAssessmentStage>;
  } catch {
    return {};
  }
}

export function loadAssessmentStage(assessmentId: string): StoredAssessmentStage | null {
  return readAll()[assessmentId] ?? null;
}

export function saveAssessmentStage(assessmentId: string, stage: StoredAssessmentStage) {
  if (typeof sessionStorage === "undefined") return;
  const next = { ...readAll(), [assessmentId]: stage };
  const serialized = JSON.stringify(next);
  if (sessionStorage.getItem(key) === serialized) return;
  sessionStorage.setItem(key, serialized);
  notify();
}

export function removeAssessmentStage(assessmentId: string) {
  if (typeof sessionStorage === "undefined") return;
  const next = { ...readAll() };
  delete next[assessmentId];
  sessionStorage.setItem(key, JSON.stringify(next));
  notify();
}
