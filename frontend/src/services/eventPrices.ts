/**
 * @file EventPrice API — CRUD for price tiers attached to events.
 *
 * Paths match the backend: `/api/v1/event/price` (see `event_price.ts` routes).
 *
 * Public endpoints (no session required):
 *   - {@link getEventPrices} — list all event prices
 *   - {@link getEventPrice}  — fetch one event price by ID
 *
 * Protected endpoints (active session required):
 *   - {@link getEventPriceWithMeta}, {@link createEventPrice},
 *     {@link replaceEventPrice}, {@link updateEventPrice},
 *     {@link deleteEventPrice}
 *
 * Usage:
 * ```ts
 * import { getEventPrice, createEventPrice } from "@/services/eventPrices";
 * ```
 */

import type { EventPrice, EventPriceWithMeta } from "@viernulvier/shared";
import { apiFetch } from "./api";

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/** Payload for creating a new price tier for an event. */
export interface CreateEventPriceInput {
  /** ID of the event this price tier belongs to. */
  event: number;
  /** Price amount (non-negative, in the currency used by the system). */
  amount: number;
}

/**
 * Payload for fully replacing an event price (PUT semantics).
 * Identical shape to {@link CreateEventPriceInput}.
 */
export type ReplaceEventPriceInput = CreateEventPriceInput;

/**
 * Payload for partially updating an event price (PATCH semantics).
 * Only include the fields that should change.
 */
export type UpdateEventPriceInput = Partial<CreateEventPriceInput>;

// ---------------------------------------------------------------------------
// Public endpoints
// ---------------------------------------------------------------------------

/**
 * Fetches all event price tiers (public — no session required).
 *
 * @example
 * const prices = await getEventPrices();
 */
export async function getEventPrices(): Promise<EventPrice[]> {
  return await apiFetch<EventPrice[]>("/event/price");
}

/**
 * Fetches a single event price tier by ID (public — no session required).
 *
 * @param id The event price's primary key.
 * @throws {ApiError} 404 — event price not found.
 */
export async function getEventPrice(id: number): Promise<EventPrice> {
  return await apiFetch<EventPrice>(`/event/price/${id}`);
}

// ---------------------------------------------------------------------------
// Protected endpoints
// ---------------------------------------------------------------------------

/**
 * Fetches a single event price tier including audit metadata.
 *
 * @param id The event price's primary key.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — event price not found.
 */
export async function getEventPriceWithMeta(
  id: number,
): Promise<EventPriceWithMeta> {
  return await apiFetch<EventPriceWithMeta>(`/event/price/${id}/meta`);
}

/**
 * Creates a new price tier for an event.
 *
 * @param data Event ID and price amount.
 * @returns    The newly created event price.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 422 — validation failed (check `err.fields`).
 *
 * @example
 * const price = await createEventPrice({ event: 7, amount: 18.50 });
 */
export async function createEventPrice(
  data: CreateEventPriceInput,
): Promise<EventPrice> {
  return await apiFetch<EventPrice>("/event/price", { method: "POST", body: data });
}

/**
 * Replaces an event price tier entirely (PUT semantics — all fields required).
 *
 * @param id   The event price's primary key.
 * @param data Full replacement payload.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — event price not found.
 */
export async function replaceEventPrice(
  id: number,
  data: ReplaceEventPriceInput,
): Promise<EventPrice> {
  return await apiFetch<EventPrice>(`/event/price/${id}`, {
    method: "PUT",
    body: data,
  });
}

/**
 * Partially updates an event price tier (PATCH semantics — only send changed fields).
 *
 * @param id   The event price's primary key.
 * @param data Only the fields that should change.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — event price not found.
 *
 * @example
 * // Adjust the price without changing the event
 * await updateEventPrice(5, { amount: 20.00 });
 */
export async function updateEventPrice(
  id: number,
  data: UpdateEventPriceInput,
): Promise<EventPrice> {
  return await apiFetch<EventPrice>(`/event/price/${id}`, {
    method: "PATCH",
    body: data,
  });
}

/**
 * Permanently deletes an event price tier.
 *
 * @param id The event price's primary key.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — event price not found.
 */
export async function deleteEventPrice(id: number): Promise<void> {
  await apiFetch<void>(`/event/price/${id}`, { method: "DELETE" });
}
