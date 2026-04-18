/**
 * @file Production API — CRUD for productions.
 *
 * Public endpoints (no session required):
 *   - {@link getProductions} — list productions (optional pagination)
 *   - {@link getProduction}  — fetch one production by ID
 *
 * Protected endpoints (active session required):
 *   - {@link getProductionWithMeta}, {@link createProduction},
 *     {@link replaceProduction}, {@link updateProduction},
 *     {@link bulkUpdateProductions}, {@link deleteProduction}
 *
 * Usage:
 * ```ts
 * import { getProductions, createProduction } from "@/services/productions";
 *
 * const list = await getProductions();
 * ```
 */

import type { ProductionWithBackwardsRefs, ProductionWithMeta, Tag } from "@viernulvier/shared";
import { apiFetch } from "./api";
import type { LanguageMap } from "@/utils/i18n";

type LinkedEntityReference = number | string | { id: unknown };

function parseLinkedEntityId(reference: LinkedEntityReference): number | null {
  if (typeof reference === "number" || typeof reference === "string") {
    const id = Number(reference);
    return Number.isFinite(id) ? id : null;
  }

  const id = Number(reference.id);
  return Number.isFinite(id) ? id : null;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/**
 * Payload for creating a new production.
 * Required fields match the backend schema — all multilingual content fields
 * that are optional default to `null` on the server.
 */
export interface CreateProductionInput {
  vendor_id: number;
  box_office_id: number;
  finalized?: boolean;
  /** Main title of the production (at least one language required). */
  title: LanguageMap;
  /** Performing artist or company. */
  artist: LanguageMap;
  /** Short tagline shown in listings. */
  tagline: LanguageMap;
  /** Short teaser text shown on overview pages. */
  teaser: LanguageMap;
  supertitle?: LanguageMap | null;
  description?: LanguageMap | null;
  description_extra?: LanguageMap | null;
  description_2?: LanguageMap | null;
  video_1?: LanguageMap | null;
  video_2?: LanguageMap | null;
  quote?: LanguageMap | null;
  quote_source?: LanguageMap | null;
  programme?: LanguageMap | null;
  info?: LanguageMap | null;
}

/**
 * Payload for fully replacing a production (PUT semantics).
 * Identical shape to {@link CreateProductionInput}.
 */
export type ReplaceProductionInput = CreateProductionInput;

/**
 * Payload for partially updating a production (PATCH semantics).
 * Only include the fields that should change.
 */
export type UpdateProductionInput = Partial<CreateProductionInput>;

/**
 * Payload for the bulk-update endpoint.
 * Applies the same partial update to every production in `ids`.
 */
export interface BulkUpdateProductionsInput {
  /** IDs of the productions to update. */
  ids: number[];
  /** Fields to change on every production in the list. */
  data: UpdateProductionInput;
}

// ---------------------------------------------------------------------------
// Public endpoints
// ---------------------------------------------------------------------------

/** Paginated public list response from {@link getProductions}. */
export type ProductionListPage = {
  items: ProductionWithBackwardsRefs[];
  /** Total number of productions (all pages), not just `items.length`. */
  total: number;
};

/**
 * Extracts normalized tag IDs from a production relation array.
 * Handles numeric IDs and object references (`{ id }`).
 */
export function extractProductionTagIds(
  production: Pick<ProductionWithBackwardsRefs, "tags">,
): number[] {
  const refs = production.tags as LinkedEntityReference[];
  const ids = refs
    .map((reference) => parseLinkedEntityId(reference))
    .filter((id): id is number => id !== null);

  return [...new Set(ids)];
}

/**
 * Collects all tags linked to a production from a pre-fetched tag map.
 * Intended for CMS usage where productions and tags are loaded in bulk.
 */
export function collectProductionTagsByIdMap(
  production: Pick<ProductionWithBackwardsRefs, "tags">,
  tagById: ReadonlyMap<number, Tag>,
): Tag[] {
  return extractProductionTagIds(production)
    .map((tagId) => tagById.get(tagId))
    .filter((tag): tag is Tag => tag !== undefined);
}

/**
 * Fetches productions (public — no session required).
 *
 * - With `{ limit, offset }`: returns one page plus the full `total` count.
 * - With `search` (string or array of strings), results must match every term
 *   (title, artist, tagline, teaser, description, hall names).
 * - With no options: returns every production as `items` and `total === items.length`.
 *
 * @returns Array of productions, each with `tags` and `events` as arrays of linked IDs.
 *
 * @example
 * const { items, total } = await getProductions({ limit: 20, offset: 0 });
 */
export async function getProductions(options?: {
  limit?: number;
  offset?: number;
  search?: string | string[];
}): Promise<ProductionListPage> {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) {
    params.set("limit", String(options.limit));
    params.set("offset", String(options.offset ?? 0));
  }
  if (options?.search !== undefined) {
    const raw = options.search;
    const terms = (Array.isArray(raw) ? raw : [raw])
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (terms.length > 0) {
      params.set("search", terms.join(","));
    }
  }
  const qs = params.toString();
  return await apiFetch<ProductionListPage>(
    qs ? `/production?${qs}` : "/production",
  );
}

/**
 * Fetches a single production by ID (public — no session required).
 *
 * @param id The production's primary key.
 * @throws {ApiError} 404 — production not found.
 *
 * @example
 * const production = await getProduction(42);
 * console.log(production.title);
 */
export async function getProduction(
  id: number,
): Promise<ProductionWithBackwardsRefs> {
  return await apiFetch<ProductionWithBackwardsRefs>(`/production/${id}`);
}

// ---------------------------------------------------------------------------
// Protected endpoints
// ---------------------------------------------------------------------------

/**
 * Fetches a single production including audit metadata
 * (`created_at`, `created_by`, `updated_at`, `updated_by`).
 *
 * @param id The production's primary key.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — production not found.
 */
export async function getProductionWithMeta(
  id: number,
): Promise<ProductionWithMeta> {
  return await apiFetch<ProductionWithMeta>(`/production/${id}/meta`);
}

/**
 * Creates a new production.
 *
 * @param data All required fields for a new production.
 * @returns    The newly created production.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 422 — validation failed (check `err.fields`).
 *
 * @example
 * const production = await createProduction({
 *   vendor_id: 1,
 *   box_office_id: 100,
 *   title: { nl: "Hamlet" },
 *   artist: { nl: "William Shakespeare" },
 *   tagline: { nl: "To be or not to be." },
 *   teaser: { nl: "Een tijdloos drama." },
 * });
 */
export async function createProduction(
  data: CreateProductionInput,
): Promise<ProductionWithBackwardsRefs> {
  return await apiFetch<ProductionWithBackwardsRefs>("/production", {
    method: "POST",
    body: data,
  });
}

/**
 * Replaces a production entirely (PUT semantics — all fields required).
 *
 * @param id   The production's primary key.
 * @param data Full replacement payload.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — production not found.
 */
export async function replaceProduction(
  id: number,
  data: ReplaceProductionInput,
): Promise<ProductionWithBackwardsRefs> {
  return await apiFetch<ProductionWithBackwardsRefs>(`/production/${id}`, {
    method: "PUT",
    body: data,
  });
}

/**
 * Partially updates a production (PATCH semantics — only send changed fields).
 *
 * @param id   The production's primary key.
 * @param data Only the fields that should change.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — production not found.
 *
 * @example
 * // Only update the Dutch title
 * await updateProduction(42, { title: { nl: "Nieuwe titel" } });
 */
export async function updateProduction(
  id: number,
  data: UpdateProductionInput,
): Promise<ProductionWithBackwardsRefs> {
  return await apiFetch<ProductionWithBackwardsRefs>(`/production/${id}`, {
    method: "PATCH",
    body: data,
  });
}

/**
 * Applies the same partial update to multiple productions in a single request.
 *
 * @param input Object containing the list of IDs and the fields to update.
 * @throws {ApiError} 401 — unauthenticated.
 *
 * @example
 * // Translate the tagline of productions 1, 2 and 3 in one call
 * await bulkUpdateProductions({
 *   ids: [1, 2, 3],
 *   data: { tagline: { en: "A timeless classic." } },
 * });
 */
export async function bulkUpdateProductions(
  input: BulkUpdateProductionsInput,
): Promise<ProductionWithBackwardsRefs[]> {
  return await apiFetch<ProductionWithBackwardsRefs[]>("/production/bulk", {
    method: "PATCH",
    body: input,
  });
}

/**
 * Permanently deletes a production.
 *
 * @param id The production's primary key.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — production not found.
 */
export async function deleteProduction(id: number): Promise<void> {
  await apiFetch<void>(`/production/${id}`, { method: "DELETE" });
}
