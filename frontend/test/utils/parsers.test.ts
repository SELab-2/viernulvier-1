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

  it("normalizes \\n escapes in plain text to <br> inside a paragraph", () => {
    const input = "Hello\\nWorld";

    const result = parseAndSanitizeContent(input);

    expect(result).toMatch(/<p>/);
    expect(result).toContain("Hello");
    expect(result).toContain("World");
    expect(result).toMatch(/<br\s*\/?>/i);
  });

  it("normalizes Windows line endings in plain text to <br>", () => {
    const input = "Hello\r\nWorld";

    const result = parseAndSanitizeContent(input);

    expect(result).toMatch(/<p>/);
    expect(result).toContain("Hello");
    expect(result).toContain("World");
  });

  it("removes standalone backslash lines (legacy CSV noise)", () => {
    const input = "Hello\n\\\nWorld";

    const result = parseAndSanitizeContent(input);

    expect(result).toMatch(/<p>/);
    expect(result).toContain("Hello");
    expect(result).toContain("World");
  });

  it("trims outer whitespace in plain text", () => {
    const input = "   hello world   ";

    const result = parseAndSanitizeContent(input);

    expect(result).toContain("hello world");
    expect(result).toMatch(/<p>/);
  });

  it("wraps plain text in a paragraph when no HTML is present", () => {
    const input = "Simple text";

    const result = parseAndSanitizeContent(input);

    expect(result).toMatch(/<p>\s*Simple text\s*<\/p>/);
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

  it("rewrites root-relative /cms_files/ img src to viernulvier.gent origin", () => {
    const input =
      '<p><img alt="abo" src="/cms_files/Image/buttons/button_bestelABO.jpg"></p>';

    const result = parseAndSanitizeContent(input);

    expect(result).toContain(
      'src="https://www.viernulvier.gent/cms_files/Image/buttons/button_bestelABO.jpg"',
    );
  });

  it("does not change img src already absolute on viernulvier CMS", () => {
    const input =
      '<p><img src="https://www.viernulvier.gent/cms_files/Image/foo.jpg"/></p>';

    const result = parseAndSanitizeContent(input);

    expect(result).toContain(
      "https://www.viernulvier.gent/cms_files/Image/foo.jpg",
    );
    expect(result).not.toContain(
      "https://www.viernulvier.genthttps:",
    );
  });

  it("rewrites img with multiline tag or src=/cms_files/… (DOM-parse path)", () => {
    const input = `<p>
<img alt="logo"
src="/cms_files/Image/x.jpg"></p>`;

    const result = parseAndSanitizeContent(input);

    expect(result).toContain("https://www.viernulvier.gent/cms_files/Image/x.jpg");
  });

  it("collapses long runs of literal newlines in plain text to at most one empty line between paragraphs", () => {
    const input = "One\n\n\n\nTwo";

    const result = parseAndSanitizeContent(input);

    expect(result).toMatch(/<p>[^<]*One/);
    expect(result).toMatch(/Two/);
    expect(result.match(/<\/p>\s*<p>/)).toBeTruthy();
  });

  it("collapses long runs of <br> tags in HTML to at most two (one blank line)", () => {
    const input = "<p>a</p><br/><br /><br/><br/>";

    const result = parseAndSanitizeContent(input);

    expect(result).toMatch(/<br\s*\/?>\s*<br\s*\/?>/i);
    expect(result.match(/<br/gi)?.length).toBe(2);
  });

  it("strips trailing <br> before </p> so the next <p> margin is not doubled", () => {
    const input =
      "<p>Intro line.<br><br></p>\n<p>Next section</p>";

    const result = parseAndSanitizeContent(input);

    expect(result).not.toMatch(/\.<br>/);
    expect(result).toContain("<p>Intro line.</p>");
    expect(result).toContain("Next section");
  });

  it("minifies newline-only gaps between block tags in sanitized HTML", () => {
    const input = "<p>Intro</p>\n<ul>\n<li>One</li>\n</ul>";

    const result = parseAndSanitizeContent(input);

    expect(result).toContain("</p><ul>");
    expect(result).toContain("<li>One</li>");
  });

  it("keeps a single space between inline tags (no line break in the gap)", () => {
    const input = "<p><a href=\"#a\">A</a> <a href=\"#b\">B</a></p>";

    const result = parseAndSanitizeContent(input);

    expect(result).toMatch(/<\/a> <a /);
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
