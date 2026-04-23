/**
 * @file Tag & TagType API — CRUD for tags and tag types.
 *
 * Tags are labels attached to productions (e.g. genre, age category).
 * Every tag belongs to a {@link TagType} (e.g. "Genre", "Leeftijd").
 *
 * Tags have a `public` flag. The public endpoints only expose visible tags;
 * the admin endpoints expose all tags regardless of visibility.
 *
 * Public endpoints:
 *   - {@link getTags}, {@link getTag}
 *   - {@link getTagTypes}, {@link getTagType}
 *
 * Protected endpoints:
 *   - {@link getAllTags}, {@link getTagAdmin}, {@link getTagWithMeta},
 *     {@link createTag}, {@link replaceTag}, {@link updateTag}, {@link deleteTag}
 *   - {@link getTagTypeWithMeta}, {@link createTagType}, {@link replaceTagType},
 *     {@link updateTagType}, {@link deleteTagType}
 *
 * Usage:
 * ```ts
 * import { getTags, createTag } from "@/services/tags";
 *
 * const tags = await getTags();
 * ```
 */

import type {
  Tag,
  TagWithMeta,
  TagType,
  TagTypeWithMeta,
} from "@viernulvier/shared";
import { apiFetch } from "./api";
import type { LanguageMap } from "@/utils/language-utils";

// ---------------------------------------------------------------------------
// Input types — Tag
// ---------------------------------------------------------------------------

/** Payload for creating a new tag. */
export interface CreateTagInput {
  /** Legacy identifier from the old system, or `null` for fresh tags. */
  old_id: number | null;
  /** Localised display name of the tag. */
  name: LanguageMap;
  /** ID of the tag type this tag belongs to. */
  tag_type: number;
  /** Whether this tag is visible to the public. */
  public: boolean;
}

/**
 * Payload for fully replacing a tag (PUT semantics).
 * Identical shape to {@link CreateTagInput}.
 */
export type ReplaceTagInput = CreateTagInput;

/**
 * Payload for partially updating a tag (PATCH semantics).
 * Only include the fields that should change.
 */
export type UpdateTagInput = Partial<CreateTagInput>;

// ---------------------------------------------------------------------------
// Input types — TagType
// ---------------------------------------------------------------------------

/** Payload for creating a new tag type. */
export interface CreateTagTypeInput {
  /** Localised display name of the tag type. */
  name: LanguageMap;
}

/**
 * Payload for fully replacing a tag type (PUT semantics).
 * Identical shape to {@link CreateTagTypeInput}.
 */
export type ReplaceTagTypeInput = CreateTagTypeInput;

/**
 * Payload for partially updating a tag type (PATCH semantics).
 * Only include the fields that should change.
 */
export type UpdateTagTypeInput = Partial<CreateTagTypeInput>;

// ---------------------------------------------------------------------------
// Tag — public endpoints
// ---------------------------------------------------------------------------

/**
 * Fetches publicly visible tags.
 * Can be filtered by production ID.
 *
 * @param productionId - Optional ID to get tags for a specific production.
 * @param options.includeProductionCount - When true, each tag includes `production_count` (distinct linked productions).
 * @example
 * const tags = await getTags(45); // Get public tags for production 45
 * const tagsWithCounts = await getTags(undefined, { includeProductionCount: true });
 */
export async function getTags(
  productionId?: number,
  options?: { includeProductionCount?: boolean },
): Promise<Tag[]> {
  const params = new URLSearchParams();
  if (productionId !== undefined) params.set("production", String(productionId));
  if (options?.includeProductionCount) params.set("includeProductionCount", "true");
  const qs = params.toString();
  return await apiFetch<Tag[]>(qs ? `/tag?${qs}` : "/tag");
}

/**
 * Fetches a single publicly visible tag by ID (public — no session required).
 *
 * @param id The tag's primary key.
 * @throws {ApiError} 404 — tag not found or not public.
 */
export async function getTag(id: number): Promise<Tag> {
  return await apiFetch<Tag>(`/tag/${id}`);
}

// ---------------------------------------------------------------------------
// Tag — protected endpoints
// ---------------------------------------------------------------------------

/**
 * Fetches all tags (including hidden ones).
 * Can be filtered by production ID.
 * @param productionId - Optional ID to get all tags for a specific production.
 * @throws {ApiError} 401 — unauthenticated.
 */
export async function getAllTags(productionId?: number): Promise<Tag[]> {
  const url = productionId ? `/tag/all?production=${productionId}` : "/tag/all";
  return await apiFetch<Tag[]>(url);
}

/**
 * Fetches tags linked to one production.
 *
 * @param productionId Production ID to filter tags for.
 * @param options.includeHidden When true, uses the admin endpoint and includes hidden tags.
 */
export async function getTagsForProduction(
  productionId: number,
  options?: { includeHidden?: boolean },
): Promise<Tag[]> {
  return options?.includeHidden ? await getAllTags(productionId) : await getTags(productionId);
}

/**
 * Fetches any tag by ID, regardless of its `public` flag.
 *
 * @param id The tag's primary key.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — tag not found.
 */
export async function getTagAdmin(id: number): Promise<Tag> {
  return await apiFetch<Tag>(`/tag/${id}/all`);
}

/**
 * Fetches a single tag including audit metadata.
 *
 * @param id The tag's primary key.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — tag not found.
 */
export async function getTagWithMeta(id: number): Promise<TagWithMeta> {
  return await apiFetch<TagWithMeta>(`/tag/${id}/meta`);
}

/**
 * Creates a new tag.
 *
 * @param data Tag name, type ID, and visibility.
 * @returns    The newly created tag.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 422 — validation failed (check `err.fields`).
 *
 * @example
 * const tag = await createTag({
 *   name: { nl: "Drama", en: "Drama", fr: "Drame" },
 *   tag_type: 1,
 *   public: true,
 * });
 */
export async function createTag(data: CreateTagInput): Promise<Tag> {
  return await apiFetch<Tag>("/tag", { method: "POST", body: data });
}

/**
 * Replaces a tag entirely (PUT semantics — all fields required).
 *
 * @param id   The tag's primary key.
 * @param data Full replacement payload.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — tag not found.
 */
export async function replaceTag(
  id: number,
  data: ReplaceTagInput,
): Promise<Tag> {
  return await apiFetch<Tag>(`/tag/${id}`, { method: "PUT", body: data });
}

/**
 * Partially updates a tag (PATCH semantics — only send changed fields).
 *
 * @param id   The tag's primary key.
 * @param data Only the fields that should change.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — tag not found.
 *
 * @example
 * // Hide a tag without changing anything else
 * await updateTag(3, { public: false });
 */
export async function updateTag(
  id: number,
  data: UpdateTagInput,
): Promise<Tag> {
  return await apiFetch<Tag>(`/tag/${id}`, { method: "PATCH", body: data });
}

/**
 * Permanently deletes a tag.
 *
 * @param id The tag's primary key.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — tag not found.
 */
export async function deleteTag(id: number): Promise<void> {
  await apiFetch<void>(`/tag/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// TagType — public endpoints
// ---------------------------------------------------------------------------

/**
 * Fetches all tag types (public — no session required).
 *
 * @example
 * const types = await getTagTypes();
 */
export async function getTagTypes(): Promise<TagType[]> {
  return await apiFetch<TagType[]>("/tag/type");
}

/**
 * Fetches a single tag type by ID (public — no session required).
 *
 * @param id The tag type's primary key.
 * @throws {ApiError} 404 — tag type not found.
 */
export async function getTagType(id: number): Promise<TagType> {
  return await apiFetch<TagType>(`/tag/type/${id}`);
}

// ---------------------------------------------------------------------------
// TagType — protected endpoints
// ---------------------------------------------------------------------------

/**
 * Fetches a single tag type including audit metadata.
 *
 * @param id The tag type's primary key.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — tag type not found.
 */
export async function getTagTypeWithMeta(id: number): Promise<TagTypeWithMeta> {
  return await apiFetch<TagTypeWithMeta>(`/tag/type/${id}/meta`);
}

/**
 * Creates a new tag type.
 *
 * @param data Localised name for the new type.
 * @returns    The newly created tag type.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 422 — validation failed (check `err.fields`).
 *
 * @example
 * const type = await createTagType({ name: { nl: "Genre", en: "Genre", fr: "Genre" } });
 */
export async function createTagType(
  data: CreateTagTypeInput,
): Promise<TagType> {
  return await apiFetch<TagType>("/tag/type", { method: "POST", body: data });
}

/**
 * Replaces a tag type entirely (PUT semantics — all fields required).
 *
 * @param id   The tag type's primary key.
 * @param data Full replacement payload.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — tag type not found.
 */
export async function replaceTagType(
  id: number,
  data: ReplaceTagTypeInput,
): Promise<TagType> {
  return await apiFetch<TagType>(`/tag/type/${id}`, { method: "PUT", body: data });
}

/**
 * Partially updates a tag type (PATCH semantics — only send changed fields).
 *
 * @param id   The tag type's primary key.
 * @param data Only the fields that should change.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — tag type not found.
 */
export async function updateTagType(
  id: number,
  data: UpdateTagTypeInput,
): Promise<TagType> {
  return await apiFetch<TagType>(`/tag/type/${id}`, { method: "PATCH", body: data });
}

/**
 * Permanently deletes a tag type.
 *
 * @param id The tag type's primary key.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — tag type not found.
 */
export async function deleteTagType(id: number): Promise<void> {
  await apiFetch<void>(`/tag/type/${id}`, { method: "DELETE" });
}
