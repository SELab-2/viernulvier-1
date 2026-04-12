/**
 * @file Event API — CRUD for events (specific occurrences of a production).
 *
 * Public endpoints (no session required):
 *   - {@link getEvents} — list all events
 *   - {@link getEvent}  — fetch one event by ID
 *
 * Protected endpoints (active session required):
 *   - {@link getEventWithMeta}, {@link createEvent}, {@link replaceEvent},
 *     {@link updateEvent}, {@link bulkUpdateEvents}, {@link deleteEvent}
 *
 * Usage:
 * ```ts
 * import { getEvents } from "@/services/events";
 *
 * const events = await getEvents();
 * ```
 */

import type { Event, EventWithMeta } from "@viernulvier/shared";
import { apiFetch } from "./api";
import type { LanguageMap } from "@/utils/i18n";

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/**
 * Payload for creating a new event.
 * Dates can be ISO 8601 strings — the backend coerces them.
 */
export interface CreateEventInput {
  /** ID of the production this event belongs to. */
  production: number;
  /** ID of the hall (venue) where the event takes place. */
  hall: number;
  /** Start date/time of the performance. ISO 8601 string or Date. */
  starts_at: string | Date;
  /** End date/time of the performance. ISO 8601 string or Date. */
  ends_at: string | Date;
  /** Time doors open. ISO 8601 string or Date. */
  doors_at: string | Date;
  /** External vendor ID. */
  vendor_id: number;
  /** Additional info text shown to the public. */
  info: LanguageMap;
}

/**
 * Payload for fully replacing an event (PUT semantics).
 * Identical shape to {@link CreateEventInput}.
 */
export type ReplaceEventInput = CreateEventInput;

/**
 * Payload for partially updating an event (PATCH semantics).
 * Only include the fields that should change.
 */
export type UpdateEventInput = Partial<CreateEventInput>;

// ---------------------------------------------------------------------------
// Public endpoints
// ---------------------------------------------------------------------------

/**
 * Fetches all events, optionally filtered by production ID (public — no session required).
 *
 * @param production Optional production ID to filter events by.
 * @returns Array of events, each including a reference to its production,
 *          hall, and price tiers.
 *
 * @example
 * // Fetch all events
 * const allEvents = await getEvents();
 *
 * // Fetch events for a specific production
 * const productionEvents = await getEvents(42);
 */
export async function getEvents(production?: number): Promise<Event[]> {
  const params = new URLSearchParams();
  if (production !== undefined) {
    params.append("production", production.toString());
  }
  const url = params.toString() ? `/event?${params.toString()}` : "/event";
  return await apiFetch<Event[]>(url);
}

/**
 * Fetches a single event by ID (public — no session required).
 *
 * @param id The event's primary key.
 * @throws {ApiError} 404 — event not found.
 *
 * @example
 * const event = await getEvent(7);
 * console.log(event.starts_at);
 */
export async function getEvent(id: number): Promise<Event> {
  return await apiFetch<Event>(`/event/${id}`);
}

// ---------------------------------------------------------------------------
// Protected endpoints
// ---------------------------------------------------------------------------

/**
 * Fetches a single event including audit metadata
 * (`created_at`, `created_by`, `updated_at`, `updated_by`).
 *
 * @param id The event's primary key.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — event not found.
 */
export async function getEventWithMeta(id: number): Promise<EventWithMeta> {
  return await apiFetch<EventWithMeta>(`/event/${id}/meta`);
}

/**
 * Creates a new event.
 *
 * @param data All required fields for a new event.
 * @returns    The newly created event.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 422 — validation failed (check `err.fields`).
 *
 * @example
 * const event = await createEvent({
 *   production: 42,
 *   hall: 1,
 *   starts_at: "2025-04-12T20:00:00",
 *   ends_at:   "2025-04-12T22:00:00",
 *   doors_at:  "2025-04-12T19:30:00",
 *   vendor_id: 999,
 *   info: { nl: "Uitverkocht" },
 * });
 */
export async function createEvent(data: CreateEventInput): Promise<Event> {
  return await apiFetch<Event>("/event", { method: "POST", body: data });
}

/**
 * Replaces an event entirely (PUT semantics — all fields required).
 *
 * @param id   The event's primary key.
 * @param data Full replacement payload.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — event not found.
 */
export async function replaceEvent(
  id: number,
  data: ReplaceEventInput,
): Promise<Event> {
  return await apiFetch<Event>(`/event/${id}`, { method: "PUT", body: data });
}

/**
 * Partially updates an event (PATCH semantics — only send changed fields).
 *
 * @param id   The event's primary key.
 * @param data Only the fields that should change.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — event not found.
 *
 * @example
 * // Mark an event as sold out
 * await updateEvent(7, { info: { nl: "Uitverkocht", en: "Sold out" } });
 */
export async function updateEvent(
  id: number,
  data: UpdateEventInput,
): Promise<Event> {
  return await apiFetch<Event>(`/event/${id}`, { method: "PATCH", body: data });
}

/**
 * Applies the same partial update to multiple events in a single request.
 *
 * @param data Array of partial updates, each containing the event `id` and
 *             the fields to change.
 * @throws {ApiError} 401 — unauthenticated.
 *
 * @example
 * await bulkUpdateEvents([
 *   { id: 1, info: { nl: "Uitverkocht" } },
 *   { id: 2, info: { nl: "Uitverkocht" } },
 * ]);
 */
export async function bulkUpdateEvents(
  data: Array<UpdateEventInput & { id: number }>,
): Promise<Event[]> {
  return await apiFetch<Event[]>("/event", { method: "PATCH", body: data });
}

/**
 * Permanently deletes an event.
 *
 * @param id The event's primary key.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — event not found.
 */
export async function deleteEvent(id: number): Promise<void> {
  await apiFetch<void>(`/event/${id}`, { method: "DELETE" });
}
