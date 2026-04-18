import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

/** Same bar for both legacy CSV importers (streaming / DB-heavy; branches are costly to drive). */
const LEGACY_IMPORTER_COVERAGE = {
  statements: 85,
  branches: 65,
  functions: 100,
  lines: 85,
} as const;

/** Default gate for application source (contrast `SCRAPER_COVERAGE` for `src/scraper`). */
const STRICT_COVERAGE = {
  statements: 97.5,
  branches: 97.5,
  functions: 97.5,
  lines: 97.5,
} as const;

const SCRAPER_COVERAGE = {
  statements: 0,
  branches: 0,
  functions: 0,
  lines: 0,
} as const;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@viernulvier/shared": path.resolve(__dirname, "../shared/src"),
    },
  },
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    exclude: ["dist/**", "node_modules/**"],
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/index.ts"],
      thresholds: {
        "src/server.ts": STRICT_COVERAGE,
        "src/db/**/*.ts": STRICT_COVERAGE,
        "src/plugins/**/*.ts": STRICT_COVERAGE,
        "src/routes/**/*.ts": STRICT_COVERAGE,
        "src/legacy-import/shared.ts": STRICT_COVERAGE,
        "src/legacy-import/validate-legacy-inserts.ts": STRICT_COVERAGE,
        "src/scraper/**/*.ts": SCRAPER_COVERAGE,
        "src/legacy-import/import-productions-legacy.ts": LEGACY_IMPORTER_COVERAGE,
        "src/legacy-import/import-events-legacy.ts": LEGACY_IMPORTER_COVERAGE,
        perFile: true,
      },
    },
    silent: true,
  },
});
