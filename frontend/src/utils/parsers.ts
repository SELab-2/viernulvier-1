import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";

/**
 * Max length of a single run of `\r` / `\n` in plain source before `normalize()`.
 * `2` -> at most `\n\n` = one blank line. Longer runs collapse to this.
 */
const MAX_PLAIN_LINE_BREAK_RUN = 2;

/** Absolute origin for root-relative `/cms_files/…` image URLs on `<img>`. */
const VIERNULLVIER_CMS_ORIGIN = "https://www.viernulvier.gent";

function normalize(input: string): string {
  return input
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/^\s*\\\s*$/gm, "")
    .replace(/[\r\n]+/g, (run) =>
      run.length <= MAX_PLAIN_LINE_BREAK_RUN
        ? run
        : "\n".repeat(MAX_PLAIN_LINE_BREAK_RUN),
    )
    .replace(/\\+$/gm, "")
    .trim();
}

/**
 * Same newline / escape cleanup as description HTML input, for fields rendered
 * with `{{ }}` (no HTML wrapper / DOMPurify).
 */
export function normalizePlainText(input: string | null | undefined): string {
  if (input === null || input === undefined || input === "") return "";
  return normalize(input);
}

function escapeHtmlPlainText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Non-HTML fields: paragraphs separated by `\n\n` (after normalize, at most
 * one blank line between blocks). Single `\n` inside a paragraph -> `<br>`.
 */
function plainNormalizedToSanitizedDisplayHtml(normalized: string): string {
  const blocks = normalized.split(/\n\n+/).filter((b) => b.trim().length > 0);
  if (blocks.length === 0) return "";
  const html = blocks
    .map((block) => {
      const inner = escapeHtmlPlainText(block.trim()).replace(/\n/g, "<br />");
      return `<p>${inner}</p>`;
    })
    .join("");
  return sanitizeHtmlForDisplay(html);
}

/**
 * `<br>` tags are often chained. Cap runs at two (one blank line)
 * so v-html blocks don’t grow huge empty bands. Literal `\r`/`\n` in the same
 * string are cleaned in `normalize()` before we branch on HTML.
 */
function collapseHtmlBreakRuns(html: string): string {
  const maxBr = Math.max(1, MAX_PLAIN_LINE_BREAK_RUN);
  const replacement = maxBr >= 2 ? "<br><br>" : "<br>";
  let out = html;
  let prev: string;
  do {
    prev = out;
    out = out.replace(
      new RegExp(`(?:\\s*<br\\s*\\/?>\\s*){${maxBr + 1},}`, "gi"),
      replacement,
    );
  } while (out !== prev);
  return out;
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

/**
 * CMS often closes a paragraph with `<br><br></p>` before the next `<p>`. Those
 * breaks stack with the next paragraph’s margin and read as double spacing.
 * Remove `<br>` runs that sit directly before `</p>`.
 */
function stripTrailingBrBeforeParagraphClose(html: string): string {
  return html.replace(/(?:<br\s*\/?>\s*)+(?=<\/p\b)/gi, "");
}

/**
 * Remove whitespace-only gaps between tags when they contain a line break. This
 * keeps HTML compact and avoids extra bands if any parent still uses `white-space:
 * pre-line`. Spaces only (`</a> <a>`) are kept.
 */
function stripIntertagLinebreakWhitespace(html: string): string {
  return html.replace(/>(\s+)</g, (full, ws: string) =>
    /\n|\r/.test(ws) ? "><" : full,
  );
}

/** After DOMPurify: root-relative `/cms_files/…` on `<img>` becomes absolute (template parse handles messy CMS markup). */
function rewriteCmsFileImgSrc(html: string): string {
  if (!html.includes("cms_files") || typeof document === "undefined") {
    return html;
  }
  try {
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    tpl.content.querySelectorAll("img[src]").forEach((img) => {
      const src = img.getAttribute("src")?.trim();
      if (src?.startsWith("/cms_files/")) {
        img.setAttribute("src", `${VIERNULLVIER_CMS_ORIGIN}${src}`);
      }
    });
    return tpl.innerHTML;
  } catch {
    return html;
  }
}

function sanitizeHtmlForDisplay(input: string): string {
  const sanitized = sanitizeHtml(input);
  const collapsed = collapseHtmlBreakRuns(sanitized);
  const noTrailingBrP = stripTrailingBrBeforeParagraphClose(collapsed);
  const strippedTags = stripIntertagLinebreakWhitespace(noTrailingBrP);
  return rewriteCmsFileImgSrc(strippedTags);
}

export function parseAndSanitizeContent(
  input: string | null | undefined,
): string {
  if (!input) return "";

  const normalized = normalize(input);

  if (!normalized) return "";

  if (isHtml(normalized)) {
    return sanitizeHtmlForDisplay(normalized);
  }

  return plainNormalizedToSanitizedDisplayHtml(normalized);
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

  return sanitizeHtmlForDisplay(rawHtml);
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
