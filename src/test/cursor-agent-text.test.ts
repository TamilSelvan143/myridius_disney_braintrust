import { describe, expect, it } from "vitest";

import { textFromCursorRun } from "@/lib/cursor-agent-text";

describe("textFromCursorRun", () => {
  it("returns RunResult.result when present", async () => {
    const text = await textFromCursorRun({
      wait: async () => ({ status: "finished", result: '{"ok":true}' }),
      conversation: async () => [],
    });
    expect(text).toBe('{"ok":true}');
  });

  it("reads assistantMessage steps when result is empty", async () => {
    const text = await textFromCursorRun({
      wait: async () => ({ status: "finished" }),
      conversation: async () => [
        {
          turn: {
            steps: [
              {
                type: "assistantMessage",
                message: { text: '```json\n{"ok":true}\n```' },
              },
            ],
          },
        },
      ],
    });
    expect(text).toContain('"ok":true');
  });
});
