import { describe, it, expect } from "vitest";
import {
  localize,
  localizeOrEmpty,
  fillLanguageMap,
  emptyLanguageMap,
  hasLanguage,
  availableLanguages,
  ALL_LANGUAGES,
} from "@/utils/i18n";

// ---------------------------------------------------------------------------
// localize
// ---------------------------------------------------------------------------

describe("localize", () => {
  it("returns the exact language when present", () => {
    expect(localize({ nl: "Welkom", en: "Welcome" }, "en")).toBe("Welcome");
  });

  it("returns the nl value when requested lang is absent (nl fallback first)", () => {
    expect(localize({ nl: "Welkom" }, "en")).toBe("Welkom");
  });

  it("falls back to en when nl is also absent", () => {
    expect(localize({ en: "Welcome" }, "fr")).toBe("Welcome");
  });

  it("falls back to fr when nl and en are both absent", () => {
    expect(localize({ fr: "Bienvenue" }, "en")).toBe("Bienvenue");
  });

  it("returns nl directly when nl is requested and present", () => {
    expect(localize({ nl: "Welkom", en: "Welcome" }, "nl")).toBe("Welkom");
  });

  it("returns null when the map is empty", () => {
    expect(localize({}, "nl")).toBeNull();
  });

  it("returns null when no language key has a value", () => {
    // Partial record with only undefined keys — simulated via empty object
    expect(localize({} as Record<never, string>, "fr")).toBeNull();
  });

  it("does not return the same language as the preferred one twice in fallback", () => {
    // nl requested, nl absent, en absent, fr present
    expect(localize({ fr: "Bienvenue" }, "nl")).toBe("Bienvenue");
  });

  it("prefers the exact match over fallback", () => {
    expect(localize({ nl: "NL", en: "EN", fr: "FR" }, "fr")).toBe("FR");
  });
});

// ---------------------------------------------------------------------------
// localizeOrEmpty
// ---------------------------------------------------------------------------

describe("localizeOrEmpty", () => {
  it("returns the localized string when available", () => {
    expect(localizeOrEmpty({ nl: "Welkom" }, "nl")).toBe("Welkom");
  });

  it("returns a fallback language string instead of empty", () => {
    expect(localizeOrEmpty({ nl: "Welkom" }, "en")).toBe("Welkom");
  });

  it("returns empty string when map is empty", () => {
    expect(localizeOrEmpty({}, "nl")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// fillLanguageMap
// ---------------------------------------------------------------------------

describe("fillLanguageMap", () => {
  it("sets all three language keys to the given value", () => {
    const result = fillLanguageMap("Hamlet");
    expect(result).toEqual({ nl: "Hamlet", en: "Hamlet", fr: "Hamlet" });
  });

  it("works with an empty string", () => {
    const result = fillLanguageMap("");
    expect(result).toEqual({ nl: "", en: "", fr: "" });
  });
});

// ---------------------------------------------------------------------------
// emptyLanguageMap
// ---------------------------------------------------------------------------

describe("emptyLanguageMap", () => {
  it("returns an object with all three keys set to empty string", () => {
    expect(emptyLanguageMap()).toEqual({ nl: "", en: "", fr: "" });
  });

  it("returns a new object on each call", () => {
    expect(emptyLanguageMap()).not.toBe(emptyLanguageMap());
  });
});

// ---------------------------------------------------------------------------
// hasLanguage
// ---------------------------------------------------------------------------

describe("hasLanguage", () => {
  it("returns true when the language has a non-empty value", () => {
    expect(hasLanguage({ nl: "Welkom" }, "nl")).toBe(true);
  });

  it("returns false when the language is absent", () => {
    expect(hasLanguage({ nl: "Welkom" }, "en")).toBe(false);
  });

  it("returns false when the language value is an empty string", () => {
    expect(hasLanguage({ nl: "" }, "nl")).toBe(false);
  });

  it("returns false when the language value is only whitespace", () => {
    expect(hasLanguage({ nl: "   " }, "nl")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// availableLanguages
// ---------------------------------------------------------------------------

describe("availableLanguages", () => {
  it("returns all three when all are set", () => {
    expect(availableLanguages({ nl: "nl", en: "en", fr: "fr" })).toEqual([
      "nl",
      "en",
      "fr",
    ]);
  });

  it("returns only the languages that have a non-empty value", () => {
    expect(availableLanguages({ nl: "Welkom", fr: "" })).toEqual(["nl"]);
  });

  it("returns an empty array when the map is empty", () => {
    expect(availableLanguages({})).toEqual([]);
  });

  it("preserves canonical order nl → en → fr", () => {
    expect(availableLanguages({ fr: "Oui", nl: "Ja" })).toEqual(["nl", "fr"]);
  });
});

// ---------------------------------------------------------------------------
// ALL_LANGUAGES constant
// ---------------------------------------------------------------------------

describe("ALL_LANGUAGES", () => {
  it("contains nl, en, fr in order", () => {
    expect(ALL_LANGUAGES).toEqual(["nl", "en", "fr"]);
  });
});
