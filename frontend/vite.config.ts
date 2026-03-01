import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env["FRONTEND_PORT"] ?? "5173"),
    fs: {
      allow: [".."],
    },
    proxy: {
      "/api": {
        target: `http://backend:${process.env["FRONTEND_PORT"] ?? "3000"}`,
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        "src/*/**/*.{ts,tsx}": {
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
