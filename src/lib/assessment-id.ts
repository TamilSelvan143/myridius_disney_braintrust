const ID_PATTERN = /^RA-(\d+)$/;

/** Next sequential reference (RA-2304, RA-2311, …) from seed + submitted ids. */
export function nextAssessmentId(existingIds: Iterable<string>): string {
  let max = 2300;
  for (const id of existingIds) {
    const match = ID_PATTERN.exec(id);
    if (!match) continue;
    const n = Number.parseInt(match[1]!, 10);
    if (n > max) max = n;
  }
  return `RA-${max + 1}`;
}
