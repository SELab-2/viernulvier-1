/**
 * @file Hall API — CRUD for halls (venue locations).
 *
 * Public endpoints (no session required):
 *   - {@link getHalls} — list all halls
 *   - {@link getHall}  — fetch one hall by ID
 *
 * Protected endpoints (active session required):
 *   - {@link getHallWithMeta}, {@link createHall}, {@link replaceHall},
 *     {@link updateHall}, {@link deleteHall}
 *
 * Usage:
 * ```ts
 * import { getHalls } from "@/services/halls";
 *
 * const halls = await getHalls();
 * ```
 */

import type { Hall, HallWithMeta } from "@viernulvier/shared";
import { apiFetch } from "./api";
import type { LanguageMap } from "../utils/i18n";

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/** Payload for creating a new hall. */
export interface CreateHallInput {
  /** External vendor ID. */
  vendor_id: number;
  /** Physical address of the venue. */
  address: string;
  /** Localised name of the hall (at least one language required). */
  name: LanguageMap;
}

/**
 * Payload for fully replacing a hall (PUT semantics).
 * Identical shape to {@link CreateHallInput}.
 */
export type ReplaceHallInput = CreateHallInput;

/**
 * Payload for partially updating a hall (PATCH semantics).
 * Only include the fields that should change.
 */
export type UpdateHallInput = Partial<CreateHallInput>;

// ---------------------------------------------------------------------------
// Public endpoints
// ---------------------------------------------------------------------------

/**
 * Fetches all halls (public — no session required).
 *
 * @example
 * const halls = await getHalls();
 */
export async function getHalls(): Promise<Hall[]> {
  return apiFetch<Hall[]>("/hall");
}

/**
 * Fetches a single hall by ID (public — no session required).
 *
 * @param id The hall's primary key.
 * @throws {ApiError} 404 — hall not found.
 *
 * @example
 * const hall = await getHall(1);
 * console.log(hall.address);
 */
export async function getHall(id: number): Promise<Hall> {
  return apiFetch<Hall>(`/hall/${id}`);
}

// ---------------------------------------------------------------------------
// Protected endpoints
// ---------------------------------------------------------------------------

/**
 * Fetches a single hall including audit metadata
 * (`created_at`, `created_by`, `updated_at`, `updated_by`).
 *
 * @param id The hall's primary key.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — hall not found.
 */
export async function getHallWithMeta(id: number): Promise<HallWithMeta> {
  return apiFetch<HallWithMeta>(`/hall/${id}/meta`);
}

/**
 * Creates a new hall.
 *
 * @param data All required fields.
 * @returns    The newly created hall.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 422 — validation failed (check `err.fields`).
 *
 * @example
 * const hall = await createHall({
 *   vendor_id: 1,
 *   address: "Sint-Pietersnieuwstraat 23, 9000 Gent",
 *   name: { nl: "Grote Zaal", en: "Main Hall" },
 * });
 */
export async function createHall(data: CreateHallInput): Promise<Hall> {
  return apiFetch<Hall>("/hall", { method: "POST", body: data });
}

/**
 * Replaces a hall entirely (PUT semantics — all fields required).
 *
 * @param id   The hall's primary key.
 * @param data Full replacement payload.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — hall not found.
 */
export async function replaceHall(
  id: number,
  data: ReplaceHallInput,
): Promise<Hall> {
  return apiFetch<Hall>(`/hall/${id}`, { method: "PUT", body: data });
}

/**
 * Partially updates a hall (PATCH semantics — only send changed fields).
 *
 * @param id   The hall's primary key.
 * @param data Only the fields that should change.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — hall not found.
 *
 * @example
 * await updateHall(1, { address: "Nieuw adres 1, 9000 Gent" });
 */
export async function updateHall(
  id: number,
  data: UpdateHallInput,
): Promise<Hall> {
  return apiFetch<Hall>(`/hall/${id}`, { method: "PATCH", body: data });
}

/**
 * Permanently deletes a hall.
 *
 * @param id The hall's primary key.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — hall not found.
 */
export async function deleteHall(id: number): Promise<void> {
  await apiFetch<void>(`/hall/${id}`, { method: "DELETE" });
}
