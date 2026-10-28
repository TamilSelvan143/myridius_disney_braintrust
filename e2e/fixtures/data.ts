/**
 * Dynamic E2E test data.
 *
 * Mirrors the Vitest factory principle: never hardcode seed values the app ships
 * with. Each run generates unique-but-valid inputs so the specs survive seed
 * changes and the move to a custom domain. Values are assertable (the spec reads
 * back what it generated).
 */

const CHANGE_TYPES = [
  "New product",
  "New geography",
  "New vendor",
  "New customer segment",
  "Limit change",
] as const;

function rand(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${rand()}`;
}

export type NewAssessmentData = {
  title: string;
  owner: string;
  changeType: (typeof CHANGE_TYPES)[number];
  summary: string;
};

/** Build a valid New Assessment form payload with randomised fields. */
export function makeNewAssessment(overrides: Partial<NewAssessmentData> = {}): NewAssessmentData {
  const id = uniqueSuffix();
  return {
    title: `E2E assessment ${id}`,
    owner: `E2E Owner ${rand()}`,
    changeType: CHANGE_TYPES[Math.floor(Math.random() * CHANGE_TYPES.length)]!,
    // Must be >= 20 chars to pass the app's change-summary validation.
    summary: `Automated end-to-end change summary ${id} covering scope and impact.`,
    ...overrides,
  };
}

/** A date string (yyyy-mm-dd) N days from today, for the editable due-date flow. */
export function dateFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
