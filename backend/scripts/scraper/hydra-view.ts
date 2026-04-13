/**
 * Reads the `page` query from a Hydra partial collection view `last` IRI (API Platform).
 * When the API omits `page` (single-page collection), treats it as page 1.
 */
export function parseHydraLastPageIndex(last: string): number {
  let url: URL;
  try {
    url = new URL(last);
  } catch {
    throw new Error(`Invalid Hydra view.last URL: ${last}`);
  }

  const raw = url.searchParams.get("page");
  if (raw === null || raw === "") {
    return 1;
  }

  const page = Number.parseInt(raw, 10);
  if (!Number.isFinite(page) || page < 1) {
    throw new Error(`Invalid page query in Hydra view.last: ${last}`);
  }

  return page;
}
