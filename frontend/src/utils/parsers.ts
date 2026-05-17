import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";

function normalize(input: string): string {
  return input
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/^\s*\\\s*$/gm, "")
    .replace(/[\r\n]{3,}/g, "\n\n")
    .replace(/\\+$/gm, "")
    .trim();
}

function isHtml(input: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(input);
}

DOMPurify.addHook("uponSanitizeElement", (node, data) => {
  if (node instanceof Element && data.tagName === "iframe") {
    const src = node.getAttribute("src") || "";

    try {
      const url = new URL(src);

      const isYouTube =
        (url.hostname === "www.youtube.com" ||
         url.hostname === "www.youtube-nocookie.com") &&
        url.pathname.startsWith("/embed/");

      if (!isYouTube) {
        node.remove();
        return;
      }
    } catch {
      node.remove();
    }
  }
});

function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: [
      "src",
      "allow",
      "allowfullscreen",
      "frameborder",
      "width",
      "height",
      "title",
    ],
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

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

export function parseAndSanitizeMd(input: string | null | undefined): string {
  if (!input) return "";

  const rawHtml = md.render(input);

  return sanitizeHtml(rawHtml);
}

/** Render markdown and return only the first paragraph as sanitized HTML. */
export function parseFirstParagraphMd(input: string | null | undefined): string {
  if (!input) return "";
  const html = md.render(input);
  const match = html.match(/<p>([\s\S]*?)<\/p>/);
  return match ? sanitizeHtml(`<p>${match[1]}</p>`) : "";
}

/** Extract the src and alt of the first markdown image: ![alt](src) */
export function extractFirstMdImage(
  input: string | null | undefined,
): { src: string; alt: string } | null {
  if (!input) return null;
  const match = input.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  if (!match) return null;
  return { alt: match[1], src: match[2] };
}
