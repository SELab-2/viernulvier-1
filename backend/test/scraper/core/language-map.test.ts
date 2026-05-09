import { describe, expect, it } from "vitest";
import { coerceLanguageMap, plainTextFromHtmlish } from "@/scraper/core/language-map.js";

describe("plainTextFromHtmlish", () => {
  it("strips tags and nbsp from vendor-style genre strings", () => {
    const raw = '<i class="fa fa-align-center" aria-hidden="true"></i>&nbsp;&nbsp;nl';
    expect(plainTextFromHtmlish(raw)).toBe("nl");
  });

  it("decodes common entities and normalizes whitespace", () => {
    expect(plainTextFromHtmlish("a&nbsp;b  c")).toBe("a b c");
    expect(plainTextFromHtmlish("Tom &amp; Jerry")).toBe("Tom & Jerry");
  });

  it("decodes &quot; and &apos;", () => {
    expect(plainTextFromHtmlish("say &quot;hello&quot;")).toBe('say "hello"');
    expect(plainTextFromHtmlish("it&apos;s fine")).toBe("it's fine");
  });

  it("decodes &lt; and &gt;", () => {
    expect(plainTextFromHtmlish("a &lt; b &gt; c")).toBe("a < b > c");
  });

  it("handles decimal numeric entities", () => {
    expect(plainTextFromHtmlish("&#65;")).toBe("A");
  });

  it("handles hex numeric entities", () => {
    expect(plainTextFromHtmlish("&#x41;")).toBe("A");
    expect(plainTextFromHtmlish("&#X41;")).toBe("A");
  });

  it("drops out-of-range decimal numeric entities", () => {
    // 0x110000 is above the max code point
    expect(plainTextFromHtmlish("&#1114112;")).toBe("");
  });

  it("drops out-of-range hex numeric entities", () => {
    expect(plainTextFromHtmlish("&#x110000;")).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(plainTextFromHtmlish("")).toBe("");
  });

  it("collapses multiple whitespace after stripping", () => {
    expect(plainTextFromHtmlish("  a   b  ")).toBe("a b");
  });
});

describe("coerceLanguageMap", () => {
  it("returns trimmed strings for valid nl/en/fr keys", () => {
    expect(coerceLanguageMap({ nl: "  Hallo  ", en: "Hello", fr: "Bonjour" })).toEqual({
      nl: "Hallo",
      en: "Hello",
      fr: "Bonjour",
    });
  });

  it("keeps only nl/en/fr and ignores other language keys", () => {
    expect(coerceLanguageMap({ nl: "Hallo", de: "Hallo", es: "Hola" })).toEqual({
      nl: "Hallo",
    });
  });

  it("returns null for null input", () => {
    expect(coerceLanguageMap(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(coerceLanguageMap(undefined)).toBeNull();
  });

  it("returns null when all values are whitespace-only", () => {
    expect(coerceLanguageMap({ nl: "   ", en: "  ", fr: " " })).toBeNull();
  });

  it("returns null when no nl/en/fr keys are present", () => {
    expect(coerceLanguageMap({ de: "Hallo" })).toBeNull();
  });

  it("returns null for empty object", () => {
    expect(coerceLanguageMap({})).toBeNull();
  });

  it("does not strip HTML — that is plainTextFromHtmlish's job", () => {
    const html = "<b>x</b>";
    expect(coerceLanguageMap({ nl: html })).toEqual({ nl: html });
  });
});