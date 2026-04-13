/**
 * Base URL is configurable when the API is not on localhost (Docker, staging).
 */
export function localApiBaseUrl(): string {
  const raw = process.env["VIERNULVIER_LOCAL_API_URL"]?.trim();
  const base = raw && raw.length > 0 ? raw : "http://localhost:3000";
  return base.replace(/\/$/, "");
}

/** Path must start with `/api/...`. */
export function localApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${localApiBaseUrl()}${p}`;
}
