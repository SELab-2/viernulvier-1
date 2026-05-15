import { defineConfig } from "vitest/config";
import path from "path";

/** Default gate for application source (contrast `SCRAPER_COVERAGE` for `src/scraper`). */
const STRICT_COVERAGE = {
  statements: 100,
  branches: 100,
  functions: 100,
  lines: 100,
} as const;

/** Less strict coverage for scraper entities and legacy imports */
const LAX_COVERAGE = {
  statements: 95,
  branches: 90,
  functions: 100,
  lines: 95,
} as const;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@viernulvier/shared": path.resolve(__dirname, "../shared/src"),
      "@mocks": path.resolve(__dirname, "./test/__mocks__"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    exclude: ["dist/**", "node_modules/**"],
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/index.ts", "src/scraper/core/load-repo-env.ts"],
      thresholds: {
        "src/server.ts": STRICT_COVERAGE,
        "src/db/**/*.ts": STRICT_COVERAGE,
        "src/plugins/**/*.ts": STRICT_COVERAGE,
        "src/routes/**/*.ts": STRICT_COVERAGE,
        "src/legacy-import/shared.ts": STRICT_COVERAGE,
        "src/legacy-import/validate-legacy-inserts.ts": STRICT_COVERAGE,
        "src/scraper/core/**/*.ts": STRICT_COVERAGE,
        "src/scraper/entities/**/*.ts": LAX_COVERAGE,
        "src/legacy-import/import-productions-legacy.ts": LAX_COVERAGE,
        "src/legacy-import/import-events-legacy.ts": LAX_COVERAGE,
        perFile: true,
      },
    },
    silent: true,
  },
});
