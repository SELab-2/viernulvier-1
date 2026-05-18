import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";

const VIERNULLVIER_CMS_ORIGIN = "https://www.viernulvier.gent";

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

export function parseAndSanitizeContent(
  input: string | null | undefined,
): string {
  if (!input) return "";

  const normalized = normalize(input);

  if (!normalized) return "";

  if (isHtml(normalized)) {
    return rewriteCmsFileImgSrc(sanitizeHtml(normalized));
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

  return rewriteCmsFileImgSrc(sanitizeHtml(rawHtml));
}