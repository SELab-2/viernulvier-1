/**
 * Resolves the base URL for this app’s HTTP API (scraper runs out-of-process).
 *
 * Use `Authorization: Bearer` on protected routes. 
 *
 * Override with `VIERNULVIER_LOCAL_API_URL` when the server is not on localhost (Docker, staging, CI).
 */
export function localApiBaseUrl(): string {
  const raw = process.env["VIERNULVIER_LOCAL_API_URL"]?.trim();
  const base = raw && raw.length > 0 ? raw : "http://localhost:3000";
  return base.replace(/\/$/, "");
}

/**
 * Builds an absolute URL under {@link localApiBaseUrl}. `path` should start with `/api/...`.
 */
export function localApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${localApiBaseUrl()}${p}`;
}
