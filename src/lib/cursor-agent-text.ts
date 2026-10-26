/** Cursor cloud runs often leave `RunResult.result` empty; text lives on conversation turns. */
export async function textFromCursorRun(run: {
  wait(): Promise<{
    status: string;
    result?: string;
    error?: { message?: string };
  }>;
  conversation(): Promise<unknown[]>;
}): Promise<string> {
  const waited = await run.wait();
  const direct = waited.result?.trim();
  if (direct) return direct;

  if (waited.status === "error") {
    throw new Error(waited.error?.message ?? "Cursor agent failed.");
  }

  const conversation = await run.conversation();
  const chunks: string[] = [];

  for (const entry of conversation) {
    const turn = (entry as { turn?: { steps?: unknown[] } }).turn;
    for (const step of turn?.steps ?? []) {
      const s = step as { type?: string; message?: { text?: string } };
      if (s.type === "assistantMessage" && s.message?.text?.trim()) {
        chunks.push(s.message.text.trim());
      }
    }
  }

  const combined = chunks.join("\n").trim();
  if (!combined) {
    throw new Error("Cursor agent returned no text.");
  }
  return combined;
}
