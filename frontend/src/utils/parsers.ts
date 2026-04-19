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

DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  if (node instanceof Element && data.tagName === 'iframe') {
    const src = node.getAttribute('src') || '';
        
    const isYouTube = src.startsWith('https://www.youtube.com/embed/') || 
                      src.startsWith('https://www.youtube-nocookie.com/embed/');

    if (!isYouTube) {
      return node.parentNode?.removeChild(node);
    }

    node.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    node.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  }
});

function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["src", "allow", "allowfullscreen", "frameborder", "width", "height", "title"],
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