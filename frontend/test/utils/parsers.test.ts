import { describe, it, expect } from "vitest";
import { parseAndSanitizeContent, normalizeQuote } from "@/utils/parsers";

// ─────────────────────────────────────────────────────────────
// parseAndSanitizeContent
// ─────────────────────────────────────────────────────────────

describe("parseAndSanitizeContent", () => {
  it("returns empty string for null/undefined", () => {
    expect(parseAndSanitizeContent(null)).toBe("");
    expect(parseAndSanitizeContent(undefined)).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(parseAndSanitizeContent("")).toBe("");
  });

  it("normalizes \\n escapes", () => {
    const input = "Hello\\nWorld";

    const result = parseAndSanitizeContent(input);

    expect(result).toBe("Hello\nWorld");
  });

  it("normalizes Windows line endings", () => {
    const input = "Hello\r\nWorld";

    const result = parseAndSanitizeContent(input);

    expect(result).toBe("Hello\nWorld");
  });

  it("removes standalone backslash lines (legacy CSV noise)", () => {
    const input = "Hello\n\\\nWorld";

    const result = parseAndSanitizeContent(input);

    expect(result).toBe("Hello\n\nWorld");
  });

  it("trims whitespace", () => {
    const input = "   hello world   ";

    const result = parseAndSanitizeContent(input);

    expect(result).toBe("hello world");
  });

  it("returns plain text when no HTML is present", () => {
    const input = "Simple text";

    const result = parseAndSanitizeContent(input);

    expect(result).toBe("Simple text");
  });

  it("returns sanitized HTML when HTML is detected", () => {
    const input = "<b>Bold</b>";

    const result = parseAndSanitizeContent(input);

    expect(result).toContain("<b>");
    expect(result).toContain("Bold");
  });

  it("strips dangerous HTML (XSS protection)", () => {
    const input = "<img src=x onerror=alert(1)>Hello";

    const result = parseAndSanitizeContent(input);

    expect(result).not.toContain("onerror");
    expect(result).toContain("Hello");
  });

  it("combines normalization + HTML sanitization", () => {
    const input = "  <b>Hello\\nWorld</b>  ";

    const result = parseAndSanitizeContent(input);

    expect(result).toContain("<b>");
    expect(result).toContain("Hello\nWorld");
  });

  it("allows YouTube embed iframes", () => {
    const input =
    '<iframe src="https://www.youtube.com/embed/abc123" width="560" height="315"></iframe>';

    const result = parseAndSanitizeContent(input);

    expect(result).toContain("iframe");
    expect(result).toContain("youtube.com/embed/abc123");
  });

  it("allows YouTube nocookie embed iframes", () => {
    const input =
    '<iframe src="https://www.youtube-nocookie.com/embed/xyz456"></iframe>';

    const result = parseAndSanitizeContent(input);

    expect(result).toContain("youtube-nocookie.com/embed/xyz456");
  });

  it("removes non-YouTube iframes", () => {
    const input =
    '<iframe src="https://evil.com/embed/hack"></iframe>';

    const result = parseAndSanitizeContent(input);

    expect(result).not.toContain("iframe");
  });

  it("removes iframe with invalid src URL", () => {
    const input =
    '<iframe src="not-a-valid-url"></iframe>';

    const result = parseAndSanitizeContent(input);

    expect(result).not.toContain("iframe");
  });

  it("blocks tricky hostname like youtube.com.evil.com", () => {
    const input =
    '<iframe src="https://www.youtube.com.evil.com/embed/abc123"></iframe>';

    const result = parseAndSanitizeContent(input);

    expect(result).not.toContain("iframe");
  });

  it("removes disallowed attributes from iframe", () => {
    const input = `
    <iframe 
      src="https://www.youtube.com/embed/abc123"
      onclick="alert(1)"
    ></iframe>
  `;

    const result = parseAndSanitizeContent(input);

    expect(result).toContain("iframe");
    expect(result).not.toContain("onclick");
  });

  it("removes iframe without src", () => {
    const input = "<iframe></iframe>";

    const result = parseAndSanitizeContent(input);

    expect(result).not.toContain("iframe");
  });
});

// ─────────────────────────────────────────────────────────────
// normalizeQuote
// ─────────────────────────────────────────────────────────────

describe("normalizeQuote", () => {
  it("removes double quotes", () => {
    expect(normalizeQuote('"Hello"')).toBe("Hello");
  });

  it("removes smart quotes", () => {
    expect(normalizeQuote("“Hello”")).toBe("Hello");
  });

  it("removes mixed quote styles", () => {
    expect(normalizeQuote("“'Hello'”")).toBe("Hello");
  });

  it("only removes quotes at edges", () => {
    expect(normalizeQuote('He said "hello" world')).toBe('He said "hello" world');
  });

  it("trims whitespace after cleanup", () => {
    expect(normalizeQuote('  "Hello"  ')).toBe("Hello");
  });

  it("returns unchanged plain text", () => {
    expect(normalizeQuote("Hello world")).toBe("Hello world");
  });

  it("handles empty string", () => {
    expect(normalizeQuote("")).toBe("");
  });
});
