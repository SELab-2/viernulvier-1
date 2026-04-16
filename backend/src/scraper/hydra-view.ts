/** Origin for resolving relative Hydra collection view IRIs (API Platform often returns path-only `first` / `last`). */
export const VIERNULVIER_API_ORIGIN = "https://www.viernulvier.gent";

/**
 * Absolute URL for a Viernulvier JSON-LD resource (`path` or full `http(s)` URL).
 * Used by hall / production-tags and similar scraper fetches.
 */
export function resolveViernulvierResourceUrl(pathOrUrl: string): string {
  const s = pathOrUrl.trim();
  if (s.startsWith("http")) return s;
  return `${VIERNULVIER_API_ORIGIN}${s.startsWith("/") ? s : `/${s}`}`;
}

/**
 * Reads the `page` query from a Hydra partial collection view IRI (API Platform).
 * IRIs may be absolute or path-only (e.g. `/api/v1/halls?page=9`); relative ones are resolved against `baseOrigin`.
 * When the API omits `page` (single-page collection), treats it as page 1.
 */
export function parseHydraLastPageIndex(
  iri: string,
  baseOrigin: string = VIERNULVIER_API_ORIGIN,
): number {
  const url = new URL(iri, baseOrigin);

  const raw = url.searchParams.get("page");
  if (raw === null || raw === "") {
    return 1;
  }

  const page = Number.parseInt(raw, 10);
  if (!Number.isFinite(page) || page < 1) {
    throw new Error(`Invalid page query in Hydra view IRI: ${iri}`);
  }

  return page;
}

/**
 * Page count for iterating a Hydra `PartialCollectionView`.
 * Uses `view.last` when present (normal for API Platform, including single-page where `last` === `first`).
 * If `last` is ever omitted for a one-page collection, falls back to `view.first`.
 */
export function totalPagesFromHydraView(
  view: { first: string; last?: string },
  baseOrigin: string = VIERNULVIER_API_ORIGIN,
): number {
  const iri = view.last ?? view.first;
  if (iri.length === 0) {
    throw new Error("Hydra view has empty first/last IRI");
  }
  return parseHydraLastPageIndex(iri, baseOrigin);
}
