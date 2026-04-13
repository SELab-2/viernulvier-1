import type { Production } from "@viernulvier/shared/index.js";
import type { z } from "zod";

import { CreateProductionBodySchema } from "@/routes/production/handlers/body-schema.js";

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

/** Raw production from Viernulvier JSON-LD (only fields we read). */
interface ProductionJSON {
  "@id": string;
  supertitle?: Record<string, string>;
  title: Record<string, string>;
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
}

interface ViernulvierProductionApiResponse {
  totalItems: number;
  member: ProductionJSON[];
}

// Fetch singular page and return raw response
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

// Fetch singular page of productions, used for pagination, refine response to return parsed JSON
async function fetchProductionsPage(
  page: number = 1,
  authToken: string,
): Promise<ViernulvierProductionApiResponse> {
  const response = await fetchPageRequest(page, authToken);

  const data = await response.json() as ViernulvierProductionApiResponse;

  return data;
}

// Fetch first page to obtain the view and total items, view will contain the last page number, which we can use to fetch all pages
async function fetchProductionsListMeta(
  authToken: string
): Promise<ProductionListMeta> {
  const response = await fetchPageRequest(1, authToken);

  const data = await response.json() as ProductionListMeta;

  return data;
}

async function login(username: string, password: string): Promise<string> {
  const response = await fetch(localApiUrl("/api/v1/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(`Failed to login: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { token: string };
  return data.token;
}

function scraperProductionToCreateBody(
  production: ProductionJSON,
  legacyId: number,
): z.infer<typeof CreateProductionBodySchema> {
  return {
    old_id: legacyId,
    finalized: false,
    title: production.title,
    artist: production.artist ?? null,
    tagline: production.tagline ?? null,
    teaser: production.teaser ?? null,
    supertitle: production.supertitle ?? null,
    description: production.description ?? null,
    description_extra: production.description_extra ?? null,
    description_2: production.description_2 ?? null,
    video_1: production.video_1 ?? null,
    video_2: production.video_2 ?? null,
    quote: production.quote ?? null,
    quote_source: production.quote_source ?? null,
    programme: production.programme ?? null,
    info: production.info ?? null,
  };
}

async function fetchLocalProductionIdByOldId(
  oldId: number,
  authToken: string,
): Promise<number | null> {
  const url = new URL(localApiUrl("/api/v1/production"));
  url.searchParams.set("old_id", String(oldId));

  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      "X-AUTH-TOKEN": authToken,
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
): Promise<number> {
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
    throw new Error(`Failed to create production: ${response.status} ${response.statusText}`);
  }

  const productionId = (await response.json() as { id: number }).id;
  return productionId;
}

async function ensureProductionImported(
  production: ProductionJSON,
  loginToken: string,
  authToken: string,
): Promise<number> {
  const oldId = parseInt(production["@id"].split("/").pop() as string, 10);
  const existing = await fetchLocalProductionIdByOldId(oldId, authToken);
  if (existing !== null) {
    console.log(`Production old_id=${oldId} already exists locally (id=${existing}), skipping create`);
    return existing;
  }
  return createLocalProductionFromViernulvierJson(production, loginToken);
}

// fetch the amount of pages, then fetch each page and process the productions
export async function scrapeAllProductions(
  authToken: string
) {
  const loginToken = await login("admin", "password");

  const meta = await fetchProductionsListMeta(authToken);
  const totalPages = totalPagesFromHydraView(meta.view);
  
  for (let page = 1; page <= totalPages; page++) {
    const data = await fetchProductionsPage(page, authToken);
    for (const production of data.member) {
      console.log(`Processing production ${production["@id"]} (${page}/${totalPages})`);
      await ensureProductionImported(production, loginToken, authToken);
    }
  }
}

export async function scrapeProductionById(
  id: number,
  authToken: string
) {
  const existing = await fetchLocalProductionIdByOldId(id, authToken);
  if (existing !== null) return existing;

  const url = `https://www.viernulvier.gent/api/v1/productions/${id}`;
  const response = await fetch(url, {
    headers: {
      accept: "application/ld+json",
      "X-AUTH-TOKEN": authToken,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch production: ${response.status} ${response.statusText}`);
  }
  const production = await response.json() as ProductionJSON;
  const loginToken = await login("admin", "password");
  return createLocalProductionFromViernulvierJson(production, loginToken);
}