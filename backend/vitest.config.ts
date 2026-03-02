import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
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
