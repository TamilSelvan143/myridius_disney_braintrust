function boundaryErrorMessage(error: unknown): string {
  if (error instanceof Response) {
    return `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/** Client-side reporting for React error boundaries (console + optional host hooks). */
export function reportBoundaryError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const payload = {
    route: window.location.pathname,
    message: boundaryErrorMessage(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  };

  console.error("[error boundary]", payload);
}
