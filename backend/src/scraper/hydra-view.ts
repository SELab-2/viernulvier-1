import { viernulvierApiOrigin } from "./viernulvier-api.js";

/**
 * Absolute URL for a Viernulvier JSON-LD resource (`path` or full `http(s)` URL).
 * Used by hall / production-tags and similar scraper fetches.
 */
export function resolveViernulvierResourceUrl(pathOrUrl: string): string {
  const s = pathOrUrl.trim();
  if (s.startsWith("http")) return s;
  const origin = viernulvierApiOrigin();
  return `${origin}${s.startsWith("/") ? s : `/${s}`}`;
}

/**
 * Reads the `page` query from a Hydra partial collection view IRI (API Platform).
 * IRIs may be absolute or path-only (e.g. `/api/v1/halls?page=9`); relative ones are resolved against `baseOrigin`.
 * When the API omits `page` (single-page collection), treats it as page 1.
 */
export function parseHydraLastPageIndex(
  iri: string,
  baseOrigin: string = viernulvierApiOrigin(),
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

/** Fallback when the API omits `view.first` / `view.last` but `totalItems` is non-zero (rare). */
const DEFAULT_HYDRA_PAGE_SIZE = 30;

/**
 * Page count for iterating a Hydra `PartialCollectionView`.
 * Uses `view.last` when present (normal for API Platform, including single-page where `last` === `first`).
 * If `last` is ever omitted for a one-page collection, falls back to `view.first`.
 * Empty collections (`totalItems` ≤ 0) return 0 even when `view` is missing (e.g. filtered events).
 */
export function totalPagesFromHydraView(
  view: { first?: string; last?: string } | undefined,
  totalItems: number,
  baseOrigin: string = viernulvierApiOrigin(),
): number {
  const total =
    typeof totalItems === "number" && Number.isFinite(totalItems) && totalItems > 0
      ? totalItems
      : 0;
  if (total <= 0) return 0;

  const iri = view?.last ?? view?.first;
  if (iri !== undefined && iri.length > 0) {
    return parseHydraLastPageIndex(iri, baseOrigin);
  }

  return Math.max(1, Math.ceil(total / DEFAULT_HYDRA_PAGE_SIZE));
}
