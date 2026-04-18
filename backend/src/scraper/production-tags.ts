/**
 * Sync Viernulvier production `genres` (/api/v1/genres) to local `tag` + `production_tag`.
 *
 * Relies on the same auth as other scraper modules (`X-AUTH-TOKEN` for Viernulvier,
 * Bearer for our API).
 */
import type { Tag, TagType } from "@viernulvier/shared/index.js";

import { hydraIriString, resolveViernulvierResourceUrl } from "./hydra-view.js";
import {
  coerceLanguageMap,
  plainTextFromHtmlish,
  SCRAPER_LANGUAGE_KEYS,
} from "./language-map.js";
import { localApiUrl } from "./local-api.js";
import { viernulvierApiUrl } from "./viernulvier-api.js";
import type { ScrapeRunStats } from "./scrape-stats.js";
import { scraperVerbose } from "./scrape-stats.js";

/** Minimal production JSON shape for genre sync (matches {@link ProductionJSON} in `production.ts`). */
export type ProductionDocumentForTags = {
  "@id": string;
  genres?: unknown;
};

interface ViernulvierGenreJSON {
  "@id": string;
  use_as?: string;
  vendor_id?: unknown;
  name?: Record<string, string>;
}

function normalizeUseAs(raw: unknown): "genre" | "tag" | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim().toLowerCase();
  if (t === "genre" || t === "tag") return t;
  return null;
}

function nameMapForGenre(g: ViernulvierGenreJSON): Record<string, string> | null {
  const fromName = coerceLanguageMap(g.name);
  if (fromName) {
    const sanitized: Record<string, string> = {};
    for (const lang of SCRAPER_LANGUAGE_KEYS) {
      const t = plainTextFromHtmlish(fromName[lang] ?? "");
      if (t !== "") sanitized[lang] = t;
    }
    if (Object.keys(sanitized).length > 0) return sanitized;
  }
  const v = g.vendor_id;
  const s =
    typeof v === "string"
      ? v.trim()
      : v != null && String(v).trim() !== ""
        ? String(v).trim()
        : "";
  const plain = plainTextFromHtmlish(s);
  if (plain === "") return null;
  return { nl: plain, en: plain, fr: plain };
}

function tagTypeMatchesCanonical(tt: TagType, canonical: string): boolean {
  const c = canonical.toLowerCase();
  for (const v of Object.values(tt.name)) {
    if (typeof v === "string" && v.trim().toLowerCase() === c) return true;
  }
  return false;
}

function normalizeGenresField(genres: unknown): unknown[] {
  if (genres == null) return [];
  if (Array.isArray(genres)) return genres;
  return [genres];
}

function genreLegacyIdFromIri(iri: string): number | null {
  const m = /\/genres\/(\d+)\/?$/.exec(iri.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 10);
  return Number.isFinite(n) ? n : null;
}

let tagTypeIdsPromise: Promise<Record<"genre" | "tag", number>> | null = null;

async function ensureScraperTagTypeIds(
  loginToken: string,
  stats?: ScrapeRunStats,
): Promise<Record<"genre" | "tag", number>> {
  return await (tagTypeIdsPromise ??= loadOrCreateTagTypes(loginToken, stats));
}

async function loadOrCreateTagTypes(
  loginToken: string,
  stats?: ScrapeRunStats,
): Promise<Record<"genre" | "tag", number>> {
  const res = await fetch(localApiUrl("/api/v1/tag/type"), {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`GET /tag/type failed: ${res.status} ${res.statusText}`);
  }
  const types = (await res.json()) as TagType[];
  const out: Partial<Record<"genre" | "tag", number>> = {};
  for (const key of ["genre", "tag"] as const) {
    const found = types.find((t) => tagTypeMatchesCanonical(t, key));
    if (found) {
      out[key] = found.id;
      continue;
    }
    const body = {
      name: { nl: key, en: key, fr: key },
    };
    const created = await fetch(localApiUrl("/api/v1/tag/type"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginToken}`,
      },
      body: JSON.stringify(body),
    });
    if (!created.ok) {
      const text = await created.text();
      throw new Error(`POST /tag/type (${key}): ${created.status} ${text}`);
    }
    const row = (await created.json()) as TagType;
    out[key] = row.id;
    if (stats !== undefined) {
      stats.tags.tagTypesCreated++;
    }
  }
  return out as Record<"genre" | "tag", number>;
}

const genreResourceByOldId: Record<number, ViernulvierGenreJSON> = {};
const tagLocalIdByTypeAndGenreOldId = new Map<string, number>();

async function fetchViernulvierGenreJson(
  genreOldId: number,
  authToken: string,
): Promise<ViernulvierGenreJSON | null> {
  const cached = genreResourceByOldId[genreOldId];
  if (cached) return cached;

  const url = viernulvierApiUrl(`/api/v1/genres/${genreOldId}`);
  const res = await fetch(url, {
    headers: {
      accept: "application/ld+json",
      "X-AUTH-TOKEN": authToken,
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.warn(`Viernulvier genres/${genreOldId}: ${res.status} ${res.statusText}`);
    return null;
  }
  const json = (await res.json()) as ViernulvierGenreJSON;
  genreResourceByOldId[genreOldId] = json;
  return json;
}

async function findLocalTagByOldIdAndType(
  genreOldId: number,
  tagTypeId: number,
  loginToken: string,
): Promise<number | null> {
  const url = new URL(localApiUrl("/api/v1/tag/all"));
  url.searchParams.set("old_id", String(genreOldId));
  url.searchParams.set("tag_type", String(tagTypeId));
  const res = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${loginToken}`,
    },
  });
  if (!res.ok) {
    console.warn(`GET /tag/all old_id&type: ${res.status} ${res.statusText}`);
    return null;
  }
  const rows = (await res.json()) as Tag[];
  if (rows.length === 0) return null;
  return rows[0]!.id;
}

async function createLocalTag(
  genreOldId: number,
  name: Record<string, string>,
  tagTypeId: number,
  loginToken: string,
): Promise<number | null> {
  const res = await fetch(localApiUrl("/api/v1/tag"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${loginToken}`,
    },
    body: JSON.stringify({
      old_id: genreOldId,
      name,
      tag_type: tagTypeId,
      public: true,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn(`POST /tag old_id=${genreOldId}: ${res.status} ${text}`);
    return null;
  }
  const row = (await res.json()) as Tag;
  return row.id;
}

async function resolveLocalTagIdForGenre(
  genreOldId: number,
  tagTypeId: number,
  name: Record<string, string>,
  loginToken: string,
  stats?: ScrapeRunStats,
): Promise<number | null> {
  const cacheKey = `${tagTypeId}:${genreOldId}`;
  const hit = tagLocalIdByTypeAndGenreOldId.get(cacheKey);
  if (hit !== undefined) return hit;

  const existing = await findLocalTagByOldIdAndType(genreOldId, tagTypeId, loginToken);
  if (existing !== null) {
    tagLocalIdByTypeAndGenreOldId.set(cacheKey, existing);
    if (stats !== undefined) {
      stats.tags.tagsReusedExisting++;
    }
    return existing;
  }

  const created = await createLocalTag(genreOldId, name, tagTypeId, loginToken);
  if (created !== null) {
    tagLocalIdByTypeAndGenreOldId.set(cacheKey, created);
    if (stats !== undefined) {
      stats.tags.tagsCreated++;
    }
  }
  return created;
}

async function linkProductionToTag(
  localProductionId: number,
  tagId: number,
  loginToken: string,
  stats?: ScrapeRunStats,
): Promise<boolean> {
  const res = await fetch(localApiUrl(`/api/v1/production/${localProductionId}/tags`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${loginToken}`,
    },
    body: JSON.stringify({ tag: tagId }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn(
      `POST /production/${localProductionId}/tags tag=${tagId}: ${res.status} ${text}`,
    );
    return false;
  }
  const body = (await res.json()) as { linked: boolean };
  if (stats !== undefined) {
    if (body.linked) {
      stats.tags.linksCreated++;
    } else {
      stats.tags.linksAlreadyPresent++;
    }
  }
  return true;
}

const productionJsonByOldId: Record<number, ProductionDocumentForTags> = {};

/** Lets {@link scrapeProductionById} warm the cache so a follow-up sync avoids a second GET. */
export function rememberViernulvierProductionJson(
  productionOldId: number,
  json: ProductionDocumentForTags,
): void {
  productionJsonByOldId[productionOldId] = json;
}

async function getViernulvierProductionJson(
  productionOldId: number,
  authToken: string,
): Promise<ProductionDocumentForTags | null> {
  const cached = productionJsonByOldId[productionOldId];
  if (cached) return cached;

  const url = viernulvierApiUrl(`/api/v1/productions/${productionOldId}`);
  const res = await fetch(url, {
    headers: {
      accept: "application/ld+json",
      "X-AUTH-TOKEN": authToken,
    },
  });
  if (!res.ok) {
    console.warn(`Viernulvier productions/${productionOldId}: ${res.status} ${res.statusText}`);
    return null;
  }
  const json = (await res.json()) as ProductionDocumentForTags;
  productionJsonByOldId[productionOldId] = json;
  return json;
}

/**
 * Uses an already-fetched production document (e.g. right after `POST` from scraper).
 */
export async function syncProductionGenreTagsWithPayload(
  localProductionId: number,
  production: ProductionDocumentForTags,
  authToken: string,
  loginToken: string,
  stats?: ScrapeRunStats,
): Promise<void> {
  const oldSeg = production["@id"]?.split("/").pop();
  const productionOldId =
    oldSeg !== undefined ? Number.parseInt(oldSeg, 10) : Number.NaN;
  if (Number.isFinite(productionOldId)) {
    productionJsonByOldId[productionOldId] = production;
  }
  await syncProductionGenreTagsInner(
    localProductionId,
    production,
    authToken,
    loginToken,
    stats,
  );
}

/**
 * Fetches the production from Viernulvier when needed (cached in-process per `productionOldId`).
 */
export async function syncProductionGenreTagsFromViernulvier(
  productionOldId: number,
  localProductionId: number,
  authToken: string,
  loginToken: string,
  stats?: ScrapeRunStats,
): Promise<void> {
  const production = await getViernulvierProductionJson(productionOldId, authToken);
  if (production === null) return;
  await syncProductionGenreTagsInner(
    localProductionId,
    production,
    authToken,
    loginToken,
    stats,
  );
}

function bumpGenresSkipped(stats: ScrapeRunStats | undefined): void {
  if (stats !== undefined) {
    stats.tags.genresSkipped++;
  }
}

async function syncProductionGenreTagsInner(
  localProductionId: number,
  production: ProductionDocumentForTags,
  authToken: string,
  loginToken: string,
  stats?: ScrapeRunStats,
): Promise<void> {
  const tagTypes = await ensureScraperTagTypeIds(loginToken, stats);
  const refs = normalizeGenresField(production.genres);

  for (const ref of refs) {
    const iri = hydraIriString(ref);
    if (iri === null) {
      bumpGenresSkipped(stats);
      continue;
    }
    const genreOldId = genreLegacyIdFromIri(resolveViernulvierResourceUrl(iri));
    if (genreOldId === null) {
      bumpGenresSkipped(stats);
      continue;
    }

    const genreJson = await fetchViernulvierGenreJson(genreOldId, authToken);
    if (genreJson === null) {
      bumpGenresSkipped(stats);
      continue;
    }

    const useAs = normalizeUseAs(genreJson.use_as);
    if (useAs === null) {
      bumpGenresSkipped(stats);
      continue;
    }

    const tagTypeId = tagTypes[useAs];
    const nameMap = nameMapForGenre(genreJson);
    if (nameMap === null) {
      if (scraperVerbose()) {
        console.log(
          `Skip genre old_id=${genreOldId} (no name/vendor_id) production local id=${localProductionId}`,
        );
      }
      bumpGenresSkipped(stats);
      continue;
    }

    const tagId = await resolveLocalTagIdForGenre(
      genreOldId,
      tagTypeId,
      nameMap,
      loginToken,
      stats,
    );
    if (tagId === null) {
      bumpGenresSkipped(stats);
      continue;
    }

    const linked = await linkProductionToTag(
      localProductionId,
      tagId,
      loginToken,
      stats,
    );
    if (!linked) {
      bumpGenresSkipped(stats);
    }
  }
}
