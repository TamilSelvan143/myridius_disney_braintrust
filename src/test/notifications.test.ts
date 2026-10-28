import { afterEach, describe, expect, it } from "vitest";

import { clearAll, markAllRead, notify } from "@/lib/notifications";

const KEY = "raw-notifications";

function readStore() {
  return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Array<{
    id: string;
    text: string;
    read: boolean;
  }>;
}

afterEach(() => {
  localStorage.removeItem(KEY);
});

describe("notifications store", () => {
  it("prepends a new notice, unread, with an id and timestamp", () => {
    const text = `fixture notice ${Math.random().toString(36).slice(2)}`;
    notify(text);

    const stored = readStore();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.text).toBe(text);
    expect(stored[0]!.read).toBe(false);
    expect(stored[0]!.id).toMatch(/.+/);
  });

  it("keeps the newest notice first", () => {
    notify("older");
    notify("newer");
    const stored = readStore();
    expect(stored.map((n) => n.text)).toEqual(["newer", "older"]);
  });

  it("marks every notice read", () => {
    notify("a");
    notify("b");
    markAllRead();
    expect(readStore().every((n) => n.read)).toBe(true);
  });

  it("caps the stored list at 50 notices", () => {
    for (let i = 0; i < 55; i++) notify(`n${i}`);
    expect(readStore()).toHaveLength(50);
    // The 50 most recent survive; the newest is first.
    expect(readStore()[0]!.text).toBe("n54");
  });

  it("clears all notices", () => {
    notify("x");
    clearAll();
    expect(readStore()).toHaveLength(0);
  });
});
