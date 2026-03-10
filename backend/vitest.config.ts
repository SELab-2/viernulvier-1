import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

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
    server: {
      deps: {
        external: [/shared/],
      },
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/index.ts"],
      thresholds: {
        "src/**/*.{ts,tsx}": {
          statements: 97.5,
          functions: 97.5,
          branches: 97.5,
          lines: 97.5,
        },
        perFile: true,
      },
    },
  },
});
