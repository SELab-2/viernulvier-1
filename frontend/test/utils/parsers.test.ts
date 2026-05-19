import { describe, it, expect } from "vitest";
import {
  parseAndSanitizeContent,
  normalizeQuote,
  parseAndSanitizeMd,
  parseFirstParagraphMd,
  extractFirstMdImage,
} from "@/utils/parsers";

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
    const input = '<iframe src="https://www.youtube-nocookie.com/embed/xyz456"></iframe>';
    const result = parseAndSanitizeContent(input);
    expect(result).toContain("youtube-nocookie.com/embed/xyz456");
  });

  it("removes non-YouTube iframes", () => {
    const input = '<iframe src="https://evil.com/embed/hack"></iframe>';
    const result = parseAndSanitizeContent(input);
    expect(result).not.toContain("iframe");
  });

  it("removes iframe with invalid src URL", () => {
    const input = '<iframe src="not-a-valid-url"></iframe>';
    const result = parseAndSanitizeContent(input);
    expect(result).not.toContain("iframe");
  });

  it("blocks tricky hostname like youtube.com.evil.com", () => {
    const input = '<iframe src="https://www.youtube.com.evil.com/embed/abc123"></iframe>';
    const result = parseAndSanitizeContent(input);
    expect(result).not.toContain("iframe");
  });

  it("removes disallowed attributes from iframe", () => {
    const input = `<iframe src="https://www.youtube.com/embed/abc123" onclick="alert(1)"></iframe>`;
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
    expect(normalizeQuote("\u201cHello\u201d")).toBe("Hello");
  });

  it("removes mixed quote styles", () => {
    expect(normalizeQuote("\u201c'Hello'\u201d")).toBe("Hello");
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

// ─────────────────────────────────────────────────────────────
// parseAndSanitizeMd
// ─────────────────────────────────────────────────────────────

describe("parseAndSanitizeMd", () => {
  it("returns empty string for null/undefined", () => {
    expect(parseAndSanitizeMd(null)).toBe("");
    expect(parseAndSanitizeMd(undefined)).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(parseAndSanitizeMd("")).toBe("");
  });

  it("renders a paragraph", () => {
    const result = parseAndSanitizeMd("Hello world");
    expect(result).toContain("<p>");
    expect(result).toContain("Hello world");
  });

  it("renders headings", () => {
    const result = parseAndSanitizeMd("## Section title");
    expect(result).toContain("<h2>");
    expect(result).toContain("Section title");
  });

  it("renders bold text", () => {
    const result = parseAndSanitizeMd("**bold**");
    expect(result).toContain("<strong>");
  });

  it("renders italic text", () => {
    const result = parseAndSanitizeMd("_italic_");
    expect(result).toContain("<em>");
  });

  it("renders links", () => {
    const result = parseAndSanitizeMd("[label](https://example.com)");
    expect(result).toContain('<a href="https://example.com"');
    expect(result).toContain("label");
  });

  it("does not render raw HTML (html: false)", () => {
    const result = parseAndSanitizeMd("<script>alert(1)</script>");
    expect(result).not.toContain("<script>");
  });

  it("strips XSS from rendered output", () => {
    const result = parseAndSanitizeMd('<a href="javascript:alert(1)">xss</a>');
    expect(result).not.toContain("href=\"javascript:");
  });

  it("renders multiple paragraphs", () => {
    const result = parseAndSanitizeMd("First\n\nSecond");
    const matches = result.match(/<p>/g);
    expect(matches?.length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────
// parseFirstParagraphMd
// ─────────────────────────────────────────────────────────────

describe("parseFirstParagraphMd", () => {
  it("returns empty string for null/undefined", () => {
    expect(parseFirstParagraphMd(null)).toBe("");
    expect(parseFirstParagraphMd(undefined)).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(parseFirstParagraphMd("")).toBe("");
  });

  it("returns the first paragraph as a <p> tag", () => {
    const result = parseFirstParagraphMd("First paragraph.\n\nSecond paragraph.");
    expect(result).toContain("<p>");
    expect(result).toContain("First paragraph.");
    expect(result).not.toContain("Second paragraph.");
  });

  it("sanitizes the output", () => {
    const result = parseFirstParagraphMd("Hello <script>alert(1)</script> world");
    expect(result).not.toContain("<script>");
    expect(result).toContain("Hello");
  });

  it("preserves inline markdown within the paragraph", () => {
    const result = parseFirstParagraphMd("This is **bold** and _italic_.");
    expect(result).toContain("<strong>");
    expect(result).toContain("<em>");
  });
});

// ─────────────────────────────────────────────────────────────
// extractFirstMdImage
// ─────────────────────────────────────────────────────────────

describe("extractFirstMdImage", () => {
  it("returns null for null/undefined", () => {
    expect(extractFirstMdImage(null)).toBeNull();
    expect(extractFirstMdImage(undefined)).toBeNull();
  });

  it("returns null when there is no image", () => {
    expect(extractFirstMdImage("Just some text.")).toBeNull();
  });

  it("extracts src and alt from a markdown image", () => {
    const result = extractFirstMdImage("![A cat](https://example.com/cat.jpg)");
    expect(result).toEqual({ src: "https://example.com/cat.jpg", alt: "A cat" });
  });

  it("extracts the first image when there are multiple", () => {
    const result = extractFirstMdImage(
      "![First](https://example.com/first.jpg) text ![Second](https://example.com/second.jpg)",
    );
    expect(result?.src).toBe("https://example.com/first.jpg");
    expect(result?.alt).toBe("First");
  });

  it("handles an empty alt text", () => {
    const result = extractFirstMdImage("![](https://example.com/image.jpg)");
    expect(result).toEqual({ src: "https://example.com/image.jpg", alt: "" });
  });

  it("extracts an image that appears after body text", () => {
    const result = extractFirstMdImage(
      "Some intro text.\n\n![Caption](https://example.com/photo.jpg)\n\nMore text.",
    );
    expect(result?.src).toBe("https://example.com/photo.jpg");
    expect(result?.alt).toBe("Caption");
  });

  it("returns null when input contains only a link (not an image)", () => {
    expect(extractFirstMdImage("[not an image](https://example.com)")).toBeNull();
  });
});