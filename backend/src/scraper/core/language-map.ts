/**
 * Normalise Viernulvier localized fields to our shared `languageMap` shape (Zod: at least one nl/en/fr string).
 */

export const SCRAPER_LANGUAGE_KEYS = ["nl", "en", "fr"] as const;

/**
 * Viernulvier sometimes puts HTML in `vendor_id` (or names) for genres; we store plain text for DB/UI.
 */
export function plainTextFromHtmlish(raw: string): string {
  let s = raw.replace(/<[^>]*>/g, " ");
  s = s.replace(/&#(\d+);/g, (_, code) => {
    const n = Number(code);
    return Number.isFinite(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
  });
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const n = parseInt(hex, 16);
    return Number.isFinite(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
  });
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Keeps only allowed language keys with non-empty trimmed strings.
 * Returns `null` when the result would be `{}` (our Zod `languageMap` rejects empty objects).
 */
export function coerceLanguageMap(
  value: Record<string, string> | undefined | null,
): Record<string, string> | null {
  if (value == null || typeof value !== "object") return null;
  const out: Record<string, string> = {};
  for (const lang of SCRAPER_LANGUAGE_KEYS) {
    // lang is from a known set of keys, not user input
    // eslint-disable-next-line security/detect-object-injection
    const raw = value[lang];
    if (typeof raw === "string" && raw.trim() !== "") {
      // lang is from a known set of keys, not user input
      // eslint-disable-next-line security/detect-object-injection
      out[lang] = raw.trim();
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}
