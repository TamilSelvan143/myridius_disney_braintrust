import "@testing-library/jest-dom/vitest";

// jsdom in this project provides sessionStorage but not localStorage, and some
// modules (e.g. src/lib/notifications.ts) use localStorage. Provide a minimal,
// spec-shaped in-memory Storage so those modules are testable. Does not affect
// production code — this file is test-only (vitest setupFiles).
function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, String(value)),
  } satisfies Storage;
}

if (typeof globalThis.localStorage === "undefined" || typeof localStorage.setItem !== "function") {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: createMemoryStorage(),
  });
}

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
