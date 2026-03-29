/**
 * @file Production API — CRUD for productions.
 *
 * Public endpoints (no session required):
 *   - {@link getProductions} — list all productions
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

import type {ProductionWithBackwardsRefs, ProductionWithMeta} from "@viernulvier/shared";
import { apiFetch } from "./api";
import type { LanguageMap } from "../utils/i18n";

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

/**
 * Fetches all productions (public — no session required).
 *
 * @returns Array of productions, each with `tags` and `events` as arrays of linked IDs.
 *
 * @example
 * const productions = await getProductions();
 */
export async function getProductions(): Promise<ProductionWithBackwardsRefs[]> {
  return await apiFetch<ProductionWithBackwardsRefs[]>("/production");
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
