/**
 * Base origin for the public Viernulvier archive HTTP API (JSON-LD / Hydra).
 *
 * Override with `VIERNULVIER_API_ORIGIN` when using another host (e.g. stubs, staging).
 */
export function viernulvierApiOrigin(): string {
  const raw = process.env["VIERNULVIER_API_ORIGIN"]?.trim();
  const base = raw && raw.length > 0 ? raw : "https://www.viernulvier.gent";
  return base.replace(/\/$/, "");
}

/**
 * Absolute URL under {@link viernulvierApiOrigin}. `path` should start with `/api/...`.
 */
export function viernulvierApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${viernulvierApiOrigin()}${p}`;
}
