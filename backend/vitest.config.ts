import { defineConfig } from "vitest/config";
import path from "path";

/** Same bar for both legacy CSV importers (streaming / DB-heavy; branches are costly to drive). */
const LEGACY_IMPORTER_COVERAGE = {
  statements: 85,
  branches: 65,
  functions: 100,
  lines: 85,
} as const;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@viernulvier/shared": path.resolve(__dirname, "../shared/src"),
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
      exclude: ["src/index.ts", "src/scraper/**"],
      thresholds: {
        "src/**/!(import-productions-legacy|import-events-legacy).{ts,tsx}": {
          statements: 97.5,
          functions: 97.5,
          branches: 97.5,
          lines: 97.5,
        },
        "src/legacy-import/import-productions-legacy.ts": LEGACY_IMPORTER_COVERAGE,
        "src/legacy-import/import-events-legacy.ts": LEGACY_IMPORTER_COVERAGE,
        perFile: true,
      },
    },
    silent: true,
  },
});
