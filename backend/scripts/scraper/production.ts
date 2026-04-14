import type { Production } from "@viernulvier/shared/index.js";
import type { z } from "zod";

import { CreateProductionBodySchema } from "@/routes/production/handlers/body-schema.js";

import { fetchScraperJwt } from "./auth.js";
import { localApiUrl } from "./local-api.js";
import { totalPagesFromHydraView } from "./hydra-view.js";

interface ProductionListMeta {
  totalItems: number;
  view: {
    "@id": string;
    "@type": string;
    first: string;
    last?: string;
  };
}

/** 
 * Raw production from Viernulvier JSON-LD (only fields we read). 
 */
interface ProductionJSON {
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
}

interface ViernulvierProductionApiResponse {
  totalItems: number;
  member: ProductionJSON[];
}

/** Must match {@link languageMap} in shared types (at least one non-empty entry for required fields). */
const LANG_KEYS = ["nl", "en", "fr"] as const;

/**
 * Keeps only allowed language keys with non-empty trimmed strings.
 * Returns `null` when the result would be `{}` (our Zod `languageMap` rejects empty objects).
 */
function coerceLanguageMap(
  value: Record<string, string> | undefined | null,
): Record<string, string> | null {
  if (value == null || typeof value !== "object") return null;
  const out: Record<string, string> = {};
  for (const lang of LANG_KEYS) {
    const raw = value[lang];
    if (typeof raw === "string" && raw.trim() !== "") {
      out[lang] = raw.trim();
    }
  }
   return Object.keys(out).length > 0 ? out : null;
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
  const url = new URL("https://www.viernulvier.gent/api/v1/productions");
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
  authToken: string
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
  const id = parseInt(production["@id"].split("/").pop() as string, 10);

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
 * Creates the production locally when `old_id` is absent; otherwise returns the existing id.
 */
async function ensureProductionImported(
  production: ProductionJSON,
  loginToken: string,
): Promise<number | null> {
  const oldId = parseInt(production["@id"].split("/").pop() as string, 10);
  const existing = await fetchLocalProductionIdByOldId(oldId);
  if (existing !== null) {
    console.log(`Production old_id=${oldId} already exists locally (id=${existing}), skipping create`);
    return existing;
  }
  if (!hasImportableProductionTitle(production)) {
    console.warn(
      `Skipping production old_id=${oldId}: no usable title, meta_title, or artist (nl/en/fr text).`,
    );
    return null;
  }
  return createLocalProductionFromViernulvierJson(production, loginToken);
}

/**
 * Optional full crawl of every Viernulvier production (not used by the default `scrape.ts` entrypoint).
 */
export async function scrapeAllProductions(
  authToken: string
) {
  const loginToken = await fetchScraperJwt();

  const meta = await fetchProductionsListMeta(authToken);
  const totalPages = totalPagesFromHydraView(meta.view);
  
  for (let page = 1; page <= totalPages; page++) {
    const data = await fetchProductionsPage(page, authToken);
    for (const production of data.member) {
      console.log(`Processing production ${production["@id"]} (${page}/${totalPages})`);
      await ensureProductionImported(production, loginToken);
    }
  }
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
): Promise<number | null> {
  const existing = await fetchLocalProductionIdByOldId(id);
  if (existing !== null) return existing;

  const url = `https://www.viernulvier.gent/api/v1/productions/${id}`;
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
  if (!hasImportableProductionTitle(production)) {
    console.warn(
      `Viernulvier production old_id=${id} has no usable title, meta_title, or artist; will not insert.`,
    );
    return null;
  }
  const jwt = loginToken ?? await fetchScraperJwt();
  return createLocalProductionFromViernulvierJson(production, jwt);
}