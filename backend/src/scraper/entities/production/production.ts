import type { Production } from "@viernulvier/shared/index.js";
import type { z } from "zod";

import { CreateProductionBodySchema } from "@/routes/production/handlers/body-schema.js";

import {
  fetchScraperJwt,
  totalPagesFromHydraView,
  viernulvierApiUrl,
  coerceLanguageMap,
  localApiUrl,
  createEmptyRunStats,
  type ScrapeRunStats,
} from "@/scraper/core/index.js";
import {
  rememberViernulvierProductionJson,
  syncProductionGenreTagsWithPayload,
  processProductionMediaGallery,
} from "@/scraper/entities/index.js";

interface ProductionListMeta {
  totalItems: number;
  view?: {
    "@id"?: string;
    "@type"?: string;
    first?: string;
    last?: string;
  };
}

/**
 * Raw production from Viernulvier JSON-LD (only fields we read).
 */
export interface ProductionJSON {
  "@id": string;
  supertitle?: Record<string, string>;
  title?: Record<string, string>;
  artist?: Record<string, string>;
  tagline?: Record<string, string>;
  teaser?: Record<string, string>;
  description?: Record<string, string>;
  description_extra?: Record<string, string>;
  description_2?: Record<string, string>;
  video_1?: Record<string, string>;
  video_2?: Record<string, string>;
  quote?: Record<string, string>;
  quote_source?: Record<string, string>;
  programme?: Record<string, string>;
  info?: Record<string, string>;
  /** SEO-style title; used as fallback when `title` is missing or empty (not stored separately in our DB). */
  meta_title?: Record<string, string>;
  /** Genre/tag IRIs or embedded objects (`/api/v1/genres/...`). */
  genres?: unknown;
  /** Galleries are either IRI strings or embedded objects depending if a single production is fetched or a page of productions is fetched. */
  /** Media gallery*/
  media_gallery?: string | { "@id": string };
  /** Review gallery*/
  review_gallery?: string | { "@id": string };
  /** Poster gallery*/
  poster_gallery?: string | { "@id": string };
}

interface ViernulvierProductionApiResponse {
  totalItems: number;
  member: ProductionJSON[];
}

/**
 * Value we send as `title` on create: real `title`, else `meta_title`, else `artist` (each must pass {@link coerceLanguageMap}).
 */
function resolveProductionTitleForCreate(production: ProductionJSON): Record<string, string> | null {
  return (
    coerceLanguageMap(production.title) ??
    coerceLanguageMap(production.meta_title) ??
    coerceLanguageMap(production.artist) ??
    null
  );
}

/**
 * Whether we can insert this production: at least one of `title`, `meta_title`, or `artist` yields a valid `languageMap`.
 */
export function hasImportableProductionTitle(production: ProductionJSON): boolean {
  return resolveProductionTitleForCreate(production) !== null;
}

/**
 * Requests one page of the Viernulvier productions list and returns the raw `Response`.
 */
async function fetchPageRequest(
  page: number = 1,
  authToken: string,
) {
  const url = new URL(viernulvierApiUrl("/api/v1/productions"));
  url.searchParams.append("page", page.toString());

  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/ld+json",
      "X-AUTH-TOKEN": authToken,
    },
  });

  if (!response.ok) {
    throw new Error(`API returned status ${response.status}`);
  }

  return response;
}

/**
 * Fetches one page of productions and parses JSON into {@link ViernulvierProductionApiResponse}.
 */
async function fetchProductionsPage(
  page: number = 1,
  authToken: string,
): Promise<ViernulvierProductionApiResponse> {
  const response = await fetchPageRequest(page, authToken);

  const data = await response.json() as ViernulvierProductionApiResponse;

  return data;
}

/**
 * Fetches page 1 only to read Hydra `view` metadata for total page count.
 */
async function fetchProductionsListMeta(
  authToken: string,
): Promise<ProductionListMeta> {
  const response = await fetchPageRequest(1, authToken);

  const data = await response.json() as ProductionListMeta;

  return data;
}

/**
 * Maps Viernulvier JSON-LD into our `CreateProduction` payload (legacy id from `@id` path segment).
 */
function scraperProductionToCreateBody(
  production: ProductionJSON,
  legacyId: number,
): z.infer<typeof CreateProductionBodySchema> {
  const title = resolveProductionTitleForCreate(production);
  if (title === null) {
    throw new Error("scraperProductionToCreateBody called without resolvable title");
  }
  return {
    old_id: legacyId,
    finalized: false,
    title,
    artist: coerceLanguageMap(production.artist),
    tagline: coerceLanguageMap(production.tagline),
    teaser: coerceLanguageMap(production.teaser),
    supertitle: coerceLanguageMap(production.supertitle),
    description: coerceLanguageMap(production.description),
    description_extra: coerceLanguageMap(production.description_extra),
    description_2: coerceLanguageMap(production.description_2),
    video_1: coerceLanguageMap(production.video_1),
    video_2: coerceLanguageMap(production.video_2),
    quote: coerceLanguageMap(production.quote),
    quote_source: coerceLanguageMap(production.quote_source),
    programme: coerceLanguageMap(production.programme),
    info: coerceLanguageMap(production.info),
  };
}

/**
 * Returns the local production id for a legacy `old_id`, or `null` if none exists.
 */
async function fetchLocalProductionIdByOldId(oldId: number): Promise<number | null> {
  const url = new URL(localApiUrl("/api/v1/production"));
  url.searchParams.set("old_id", String(oldId));

  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch production from own api: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { items: Production[]; total: number };
  if (data.total === 0) return null;
  if (data.total > 1) {
    throw new Error(`Multiple productions found with old_id ${oldId}`);
  }
  return data.items[0]!.id;
}

async function createLocalProductionFromViernulvierJson(
  production: ProductionJSON,
  loginToken: string,
): Promise<number | null> {
  const idSegment = production["@id"].split("/").pop();
  const id = idSegment !== undefined ? parseInt(idSegment, 10) : Number.NaN;
  if (!Number.isFinite(id)) {
    console.warn(`Skipping production: could not parse legacy id from ${production["@id"]}`);
    return null;
  }

  const payload = scraperProductionToCreateBody(production, id);

  const response = await fetch(localApiUrl("/api/v1/production"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${loginToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.warn(
      `Failed to create production old_id=${id}: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ""}`,
    );
    return null;
  }

  const productionId = (await response.json() as { id: number }).id;

  return productionId;
}

/**
 * Extracts gallery IRI from either a string or an embedded object.
 * Necessary as a single production fetch returns a full gallery object, but the productions list fetch returns only IRIs for galleries.
 */
function extractGalleryIri(gallery: string | { "@id": string } | undefined): string | null {
  if (!gallery) return null;
  if (typeof gallery === "string") return gallery;
  if (typeof gallery === "object" && "@id" in gallery) return gallery["@id"];
  return null;
}

/**
 * Processes all three galleries (media, review, poster) for a production.
 */
async function processProductionGalleries(
  production: ProductionJSON,
  productionId: number,
  authToken: string,
  loginToken: string,
  stats?: ScrapeRunStats,
): Promise<void> {
  const galleries = [
    { type: "media", iri: extractGalleryIri(production.media_gallery) },
    { type: "review", iri: extractGalleryIri(production.review_gallery) },
    { type: "poster", iri: extractGalleryIri(production.poster_gallery) },
  ];

  for (const gallery of galleries) {
    if (gallery.iri) {
      console.log(`Processing ${gallery.type} gallery for store-front production ${production["@id"]}...`);
      await processProductionMediaGallery(
        gallery.iri,
        productionId,
        authToken,
        loginToken,
        stats,
      );
    }
  }
}

/**
 * Creates the production locally when `old_id` is absent; otherwise returns the existing id.
 */
async function ensureProductionImported(
  production: ProductionJSON,
  loginToken: string,
  authToken: string,
  stats?: ScrapeRunStats,
): Promise<number | null> {
  const idSegment = production["@id"].split("/").pop();
  const oldId = idSegment !== undefined ? parseInt(idSegment, 10) : Number.NaN;
  if (!Number.isFinite(oldId)) {
    console.warn(`Skipping production: could not parse legacy id from ${production["@id"]}`);
    return null;
  }
  rememberViernulvierProductionJson(oldId, production);
  const existing = await fetchLocalProductionIdByOldId(oldId);
  if (existing !== null) {
    console.log(`Production old_id=${oldId} already exists locally (id=${existing}), skipping create`);
    await syncProductionGenreTagsWithPayload(
      existing,
      production,
      authToken,
      loginToken,
      stats,
    );
    // Process all galleries for existing production
    await processProductionGalleries(
      production,
      existing,
      authToken,
      loginToken,
      stats,
    );
    return existing;
  }
  if (!hasImportableProductionTitle(production)) {
    console.warn(
      `Skipping production old_id=${oldId}: no usable title, meta_title, or artist (nl/en/fr text).`,
    );
    return null;
  }
  const created = await createLocalProductionFromViernulvierJson(production, loginToken);
  if (created !== null) {
    await syncProductionGenreTagsWithPayload(
      created,
      production,
      authToken,
      loginToken,
      stats,
    );
    // Process all galleries for newly created production
    await processProductionGalleries(
      production,
      created,
      authToken,
      loginToken,
      stats,
    );
  }
  return created;
}

/**
 * Optional full crawl of every Viernulvier production (not used by the default `scrape.ts` entrypoint).
 */
export async function scrapeAllProductions(
  authToken: string,
) {
  const loginToken = await fetchScraperJwt();
  const stats = createEmptyRunStats();

  const meta = await fetchProductionsListMeta(authToken);
  const totalPages = totalPagesFromHydraView(meta.view, meta.totalItems);
  
  for (let page = 1; page <= totalPages; page++) {
    const data = await fetchProductionsPage(page, authToken);
    for (const production of data.member) {
      console.log(`Processing store-front production ${production["@id"]} (${page}/${totalPages})`);
      await ensureProductionImported(production, loginToken, authToken, stats);
    }
  }

  console.log("Tag sync stats (full production crawl):", stats.tags);
}

/**
 * Fetches a single production by legacy id from Viernulvier and ensures it exists locally.
 *
 * Returns `null` when the remote production is missing (404), not importable (no usable title), or the local `POST` fails.
 */
export async function scrapeProductionById(
  id: number,
  authToken: string,
  loginToken?: string,
  stats?: ScrapeRunStats,
): Promise<number | null> {
  const existing = await fetchLocalProductionIdByOldId(id);
  if (existing !== null) {
    if (stats !== undefined) stats.productions.reusedExisting++;
    return existing;
  }

  const url = viernulvierApiUrl(`/api/v1/productions/${id}`);
  const response = await fetch(url, {
    headers: {
      accept: "application/ld+json",
      "X-AUTH-TOKEN": authToken,
    },
  });
  if (response.status === 404) {
    console.warn(`Viernulvier production old_id=${id} not found (404); will not import.`);
    return null;
  }
  if (!response.ok) {
    console.warn(`Viernulvier production old_id=${id} fetch failed: ${response.status} ${response.statusText}`);
    return null;
  }
  const production = await response.json() as ProductionJSON;
  rememberViernulvierProductionJson(id, production);
  if (!hasImportableProductionTitle(production)) {
    console.warn(
      `Viernulvier production old_id=${id} has no usable title, meta_title, or artist; will not insert.`,
    );
    return null;
  }
  const jwt = loginToken ?? await fetchScraperJwt();
  const created = await createLocalProductionFromViernulvierJson(production, jwt);
  if (created !== null) {
    if (stats !== undefined){
      stats.productions.created++;
    }
    await processProductionGalleries(
      production,
      created,
      authToken,
      jwt,
      stats,
    );
  }
  return created;
}