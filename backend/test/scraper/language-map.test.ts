import { describe, expect, it } from "vitest";
import { coerceLanguageMap, plainTextFromHtmlish } from "@/scraper/language-map.js";

describe("plainTextFromHtmlish", () => {
  it("strips tags and nbsp from vendor-style genre strings", () => {
    const raw =
      '<i class="fa fa-align-center" aria-hidden="true"></i>&nbsp;&nbsp;nl';
    expect(plainTextFromHtmlish(raw)).toBe("nl");
  });

  it("decodes common entities and normalizes whitespace", () => {
    expect(plainTextFromHtmlish("a&nbsp;b  c")).toBe("a b c");
    expect(plainTextFromHtmlish("Tom &amp; Jerry")).toBe("Tom & Jerry");
  });

  it("handles decimal and hex numeric entities", () => {
    expect(plainTextFromHtmlish("&#65;")).toBe("A");
    expect(plainTextFromHtmlish("&#x41;")).toBe("A");
  });
});

describe("coerceLanguageMap", () => {
  it("still returns trimmed strings without HTML stripping (production fields)", () => {
    const html = '<b>x</b>';
    expect(coerceLanguageMap({ nl: html })).toEqual({ nl: html });
  });
});
