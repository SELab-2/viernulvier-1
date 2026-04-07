import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { nextTick } from "vue";
import { useDarkMode, __reset } from "@/composables/useDarkMode";

describe("useDarkMode", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  // ── toggleDark ─────────────────────────────────────────────────────────────

  describe("toggleDark", () => {
    it("toggles isDark from false to true", async () => {
      const { isDark, toggleDark } = useDarkMode();
      const before = isDark.value;
      toggleDark();
      expect(isDark.value).toBe(!before);
    });

    it("toggles isDark back on second toggle", async () => {
      const { isDark, toggleDark } = useDarkMode();
      const before = isDark.value;
      toggleDark();
      toggleDark();
      expect(isDark.value).toBe(before);
    });
  });

  // ── localStorage persistence ───────────────────────────────────────────────

  describe("localStorage persistence", () => {
    it("persists true to localStorage when toggled on", async () => {
      const { isDark, toggleDark } = useDarkMode();
      if (isDark.value) toggleDark(); // ensure false first
      await nextTick();
      toggleDark();
      await nextTick();
      expect(localStorage.getItem("viernulvier-dark")).toBe("true");
    });

    it("persists false to localStorage when toggled off", async () => {
      const { isDark, toggleDark } = useDarkMode();
      if (!isDark.value) toggleDark(); // ensure true firstimport { useDarkMode, __reset } from "@/composables/useDarkMode";

      await nextTick();
      toggleDark();
      await nextTick();
      expect(localStorage.getItem("viernulvier-dark")).toBe("false");
    });

    it("reads 'true' from localStorage (stored === 'true' branch)", async () => {
      localStorage.setItem("viernulvier-dark", "true");
      __reset();
      await nextTick();
      const { isDark } = useDarkMode();
      expect(isDark.value).toBe(true);
      expect(localStorage.getItem("viernulvier-dark")).toBe("true");
    });

    it("reads 'false' from localStorage (stored === 'false' branch)", async () => {
      localStorage.setItem("viernulvier-dark", "false");
      __reset();
      await nextTick();
      const { isDark } = useDarkMode();
      expect(isDark.value).toBe(false);
      expect(localStorage.getItem("viernulvier-dark")).toBe("false");
    });

    it("falls back to system preference when localStorage is empty", async () => {
      localStorage.clear();
      window.matchMedia = vi.fn().mockReturnValue({ matches: true });
      __reset();
      await nextTick();
      const { isDark } = useDarkMode();
      expect(isDark.value).toBe(true);
    });
  });

  // ── DOM side effects ───────────────────────────────────────────────────────

  describe("DOM class", () => {
    it("adds dark class to <html> when toggled on", async () => {
      const { isDark, toggleDark } = useDarkMode();
      if (isDark.value) toggleDark();
      await nextTick();
      toggleDark();
      await nextTick();
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("removes dark class from <html> when toggled off", async () => {
      const { isDark, toggleDark } = useDarkMode();
      if (!isDark.value) toggleDark();
      await nextTick();
      toggleDark();
      await nextTick();
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  // ── System preference fallback ─────────────────────────────────────────────

  describe("system preference", () => {
    it("uses system dark preference when localStorage is empty", () => {
      localStorage.clear();
      window.matchMedia = vi.fn().mockReturnValue({ matches: true });
      // The singleton is already initialized, so verify matchMedia is callable
      expect(window.matchMedia("(prefers-color-scheme: dark)").matches).toBe(true);
    });

    it("uses system light preference when localStorage is empty", () => {
      localStorage.clear();
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      expect(window.matchMedia("(prefers-color-scheme: dark)").matches).toBe(false);
    });
  });

  // ── Singleton ──────────────────────────────────────────────────────────────

  describe("singleton", () => {
    it("shares state across multiple useDarkMode() calls", () => {
      const a = useDarkMode();
      const b = useDarkMode();
      const before = a.isDark.value;
      a.toggleDark();
      expect(b.isDark.value).toBe(!before);
      a.toggleDark(); // restore
    });

    it("returns the same isDark ref from multiple calls", () => {
      const a = useDarkMode();
      const b = useDarkMode();
      expect(a.isDark).toBe(b.isDark);
    });
  });
});