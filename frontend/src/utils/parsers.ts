import DOMPurify from "dompurify";

function normalize(input: string): string {
  return input
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/^\s*\\\s*$/gm, "")
    .trim();
}

function isHtml(input: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(input);
}

function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    USE_PROFILES: { html: true },
  });
}

export function parseAndSanitizeContent(
  input: string | null | undefined,
): string {
  if (!input) return "";

  const normalized = normalize(input);

  if (!normalized) return "";

  if (isHtml(normalized)) {
    return sanitizeHtml(normalized);
  }

  return normalized;
}

export function normalizeQuote(input: string): string {
  return input
    .trim()
    .replace(/^["“”']+/, "")
    .replace(/["“”']+$/, "")
    .trim();
}