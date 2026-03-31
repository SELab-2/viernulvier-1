import { describe, it, expect, beforeEach, vi } from "vitest";
import { useDarkMode } from "@/composables/useDarkMode";

// helper om matchMedia te mocken
function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("useDarkMode", () => {
  beforeEach(() => {
    // reset localStorage en mocks
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("uses localStorage if value exists (true)", () => {
    localStorage.setItem("viernulvier-dark", "true");

    const { isDark } = useDarkMode();

    expect(isDark.value).toBe(true);
  });

  it("uses localStorage if value exists (false)", () => {
    localStorage.setItem("viernulvier-dark", "false");

    const { isDark } = useDarkMode();

    expect(isDark.value).toBe(false);
  });

  it("falls back to OS preference when no localStorage (dark)", () => {
    mockMatchMedia(true);

    const { isDark } = useDarkMode();

    expect(isDark.value).toBe(true);
  });

  it("falls back to OS preference when no localStorage (light)", () => {
    mockMatchMedia(false);

    const { isDark } = useDarkMode();

    expect(isDark.value).toBe(false);
  });

  it("falls back to false when matchMedia is not available", () => {
    // verwijder matchMedia volledig
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: undefined,
    });

    const { isDark } = useDarkMode();

    expect(isDark.value).toBe(false);
  });

  it("updates document class when isDark changes", async () => {
    mockMatchMedia(false);

    const { isDark } = useDarkMode();

    // start = light
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    // toggle naar dark
    isDark.value = true;

    // wacht tot watchEffect loopt
    await Promise.resolve();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("persists value to localStorage when changed", async () => {
    mockMatchMedia(false);

    const { isDark } = useDarkMode();

    isDark.value = true;

    await Promise.resolve();

    expect(localStorage.getItem("viernulvier-dark")).toBe("true");
  });
});