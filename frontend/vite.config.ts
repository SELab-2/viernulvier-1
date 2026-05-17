import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@viernulvier/shared": fileURLToPath(
        new URL("../shared/src/index.ts", import.meta.url),
      ),
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
        target: `http://backend:${process.env["BACKEND_PORT"] ?? "3000"}`,
        changeOrigin: true,
      },
      /** Same as backend `cropProxyRoute` — crop URLs are `/media/crops/…`. */
      "/media": {
        target: `http://backend:${process.env["BACKEND_PORT"] ?? "3000"}`,
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx,vue}"],
      exclude: [
        "**/*.d.ts",
        /** Markup-only glyphs */
        "src/components/icons/**",
      ],
      thresholds: {
        "src/**/*.{ts,tsx,vue}": {
          statements: 80,
          functions: 80,
          branches: 80,
          lines: 80,
        },
        perFile: true,
      },
    },
  },
});
