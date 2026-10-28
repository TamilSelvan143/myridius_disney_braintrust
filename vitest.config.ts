import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      // The headline % reflects first-party logic the *unit* layer can actually
      // drive in jsdom. Excluded:
      //  - vendored shadcn/ui primitives, generated route tree, tests, bootstrap;
      //  - server-runtime / full-browser modules that jsdom cannot execute and
      //    that are instead exercised end-to-end by the Playwright suite (see
      //    e2e/): risk-guardian.tsx (3.4k-line interactive workbench + its
      //    createServerFn AI handlers) and __root.tsx (router/SSR document shell).
      // assessment-ai.ts is deliberately KEPT in the denominator — its pure
      // prompt/parse logic is unit-tested; only its createServerFn handlers are
      // E2E-only, so its number honestly reflects partial unit coverage.
      exclude: [
        "src/components/ui/**",
        "src/test/**",
        "src/**/*.gen.ts",
        "src/router.tsx",
        "src/server.ts",
        "src/start.ts",
        "src/routeTree.gen.ts",
        "src/styles.css",
        // Covered by the Playwright E2E layer, not the jsdom unit layer:
        "src/components/risk-guardian.tsx",
        "src/routes/__root.tsx",
      ],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
