import { describe, it, expect, beforeEach } from "vitest";
import {
  detectLanguage,
  saveLanguagePreference,
  SUPPORTED_LANGS,
  DEFAULT_LANG,
  i18n,
} from "@/i18n";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("i18n", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── detectLanguage ─────────────────────────────────────────────────────────

  describe("detectLanguage()", () => {
    it("returns the language stored in localStorage if valid", () => {
      localStorage.setItem("preferred-lang", "fr");
      expect(detectLanguage()).toBe("fr");
    });

    it.each(SUPPORTED_LANGS)(
      "returns '%s' when it is stored in localStorage",
      (lang) => {
        localStorage.setItem("preferred-lang", lang);
        expect(detectLanguage()).toBe(lang);
      },
    );

    it("ignores an invalid language stored in localStorage", () => {
      localStorage.setItem("preferred-lang", "de");
      // Falls through to browser language or default
      expect(SUPPORTED_LANGS).toContain(detectLanguage());
    });

    it("falls back to the browser language when localStorage is empty", () => {
      // jsdom sets navigator.language to "en" by default
      const browserLang = navigator.language.split("-")[0];
      const expected = SUPPORTED_LANGS.includes(browserLang as any)
        ? browserLang
        : DEFAULT_LANG;
      expect(detectLanguage()).toBe(expected);
    });

    it("falls back to the default language when localStorage is empty and browser language is unsupported", () => {
      localStorage.clear();
      // Override navigator.language to an unsupported language
      Object.defineProperty(navigator, "language", {
        value: "de-DE",
        configurable: true,
      });
      expect(detectLanguage()).toBe(DEFAULT_LANG);
      // Restore to English for other tests
      Object.defineProperty(navigator, "language", {
        value: "en-US",
        configurable: true,
      });
    });

    it("localStorage takes priority over browser language", () => {
      localStorage.setItem("preferred-lang", "nl");
      Object.defineProperty(navigator, "language", {
        value: "fr-FR",
        configurable: true,
      });
      expect(detectLanguage()).toBe("nl");
      Object.defineProperty(navigator, "language", {
        value: "en-US",
        configurable: true,
      });
    });
  });

  // ── saveLanguagePreference ─────────────────────────────────────────────────

  describe("saveLanguagePreference()", () => {
    it("saves the language to localStorage", () => {
      saveLanguagePreference("fr");
      expect(localStorage.getItem("preferred-lang")).toBe("fr");
    });

    it.each(SUPPORTED_LANGS)("correctly saves '%s' to localStorage", (lang) => {
      saveLanguagePreference(lang);
      expect(localStorage.getItem("preferred-lang")).toBe(lang);
    });

    it("overwrites a previously saved language", () => {
      saveLanguagePreference("nl");
      saveLanguagePreference("en");
      expect(localStorage.getItem("preferred-lang")).toBe("en");
    });
  });

  // ── i18n instance ──────────────────────────────────────────────────────────

  describe("i18n instance", () => {
    it("has the default locale set to nl", () => {
      expect(i18n.global.locale.value).toBe(DEFAULT_LANG);
    });

    it("has all supported languages loaded as messages", () => {
      const loadedLocales = Object.keys(i18n.global.messages.value);
      expect(loadedLocales).toEqual(expect.arrayContaining(["nl", "fr", "en"]));
    });
  });
});
