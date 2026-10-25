const key = "risk-workbench-submitted";

export type SubmittedAssessmentRecord = {
  id: string;
  title: string;
  owner: string;
  changeType: string;
  changeSummary: string;
  file: string;
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeSubmittedAssessments(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function loadSubmittedAssessments(): SubmittedAssessmentRecord[] {
  if (typeof sessionStorage === "undefined") return [];
  const raw = sessionStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SubmittedAssessmentRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function registerSubmittedAssessment(record: SubmittedAssessmentRecord) {
  if (typeof sessionStorage === "undefined") return;
  const existing = loadSubmittedAssessments();
  const next = [record, ...existing.filter((r) => r.id !== record.id)];
  const serialized = JSON.stringify(next);
  if (sessionStorage.getItem(key) === serialized) return;
  sessionStorage.setItem(key, serialized);
  notify();
}

export function getSubmittedAssessment(id: string): SubmittedAssessmentRecord | undefined {
  return loadSubmittedAssessments().find((r) => r.id === id);
}
