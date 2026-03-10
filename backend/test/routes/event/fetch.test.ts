import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildServer } from "@/server.js";

let server: FastifyInstance;
let storedEventPrices: Array<Record<string, unknown>>;

const baseMockEvent = {
	id: 1,
	starts_at: new Date("2026-01-01T18:00:00.000Z"),
	ends_at: new Date("2026-01-01T20:00:00.000Z"),
	production: 10,
	hall: 3,
	doors_at: new Date("2026-01-01T17:30:00.000Z"),
	vendor_id: 42,
	info: { nl: "Info mock 1" },
};

const metaData = {
	created_at: new Date("2025-12-31T09:00:00.000Z"),
	updated_at: new Date("2026-01-01T09:00:00.000Z"),
	created_by: 7,
	updated_by: 8,
};

const mockEvents = [
	baseMockEvent,
	{ ...baseMockEvent, id: 2, production: 11, hall: 4, info: { nl: "Info mock 2" }},
	{ ...baseMockEvent, id: 3, production: 12, hall: 5, info: { nl: "Info mock 3" }},
];

const mockInvalidEvent = {
	...baseMockEvent,
    id: 500,
	doors_at: "invalid-date",
};

const mockEventPrices = [
	{ id: 1, event: 1, amount: 25.50 },
	{ id: 2, event: 2, amount: 30.00 },
	{ id: 3, event: 3, amount: 22.75 },
    { id: 4, event: 1, amount: 15.00 },
];

beforeAll(async () => {
	server = await buildServer();
	storedEventPrices = structuredClone(mockEventPrices);

	server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
		// Handle queries that fetch event_prices
		if (query.includes("FROM event_prices")) {
			const eventId = params?.[0] as number | undefined;
			if (eventId) {
				const prices = storedEventPrices.filter(p => p["event"] === eventId);
				return Promise.resolve({ rows: prices });
			}
			return Promise.resolve({ rows: storedEventPrices });
		}

		// Handle single event with metadata (created_at, updated_at fields)
		if (query.includes("created_at") && query.includes("updated_at") && query.includes("WHERE id = $1")) {
			const id: number = params?.[0] as number;
			if (id === 500) {
				return Promise.resolve({ rows: [mockInvalidEvent] });
			}
			if (id > 0 && id <= mockEvents.length) {
                const event = { ...mockEvents[Number(id) - 1], ...metaData };
                return Promise.resolve({ rows: [event] });
            }

			const event = { ...baseMockEvent };
			return Promise.resolve({ rows: [event] });
		}

		// Handle single event fetch by ID
		if (query.includes("WHERE id = $1")) {
			const id: number = params?.[0] as number;
			if (id === 500) {
				return Promise.resolve({ rows: [mockInvalidEvent] });
			}
			if (id > 0 && id <= mockEvents.length) {
                const event = { ...mockEvents[Number(id) - 1] };
                return Promise.resolve({ rows: [event] });
            }

			const event = { ...baseMockEvent };
			return Promise.resolve({ rows: [event] });
		}

		// Handle fetching all events (no WHERE clause)
		return Promise.resolve({ rows: mockEvents });
	});
});

afterAll(async () => {
	await server.close();
});

describe("Event Fetch Routes", () => {
	describe("single event", () => {
		test("GET /api/v1/event/:id", async () => {
			const response = await server.inject({
				method: "GET",
				url: "/api/v1/event/1",
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({
				...baseMockEvent,
				starts_at: baseMockEvent.starts_at.toISOString(),
				ends_at: baseMockEvent.ends_at.toISOString(),
				doors_at: baseMockEvent.doors_at.toISOString(),
			});
		});

		test("returns 404 when single event is not found", async () => {
			const response = await server.inject({
				method: "GET",
				url: "/api/v1/event/404",
			});

			expect(response.statusCode).toBe(404);
			//expect(response.json()).toEqual({ error: "Not Found" });
		});

		test("returns 500 when database row is invalid", async () => {
			const response = await server.inject({
				method: "GET",
				url: "/api/v1/event/500",
			});

			expect(response.statusCode).toBe(500);
			//expect(response.json()).toEqual({ error: "Internal server error" });
		});
	});

	describe("multiple events", () => {
		test("GET /api/v1/event", async () => {
			const response = await server.inject({
				method: "GET",
				url: "/api/v1/event",
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toHaveLength(3);
			expect(response.json()).toEqual([
				{
					...mockEvents[0],
					starts_at: mockEvents[0]!.starts_at.toISOString(),
					ends_at: mockEvents[0]!.ends_at.toISOString(),
					doors_at: mockEvents[0]!.doors_at.toISOString(),
				},
				{
					...mockEvents[1],
					starts_at: mockEvents[1]!.starts_at.toISOString(),
					ends_at: mockEvents[1]!.ends_at.toISOString(),
					doors_at: mockEvents[1]!.doors_at.toISOString(),
				},
				{
					...mockEvents[2],
					starts_at: mockEvents[2]!.starts_at.toISOString(),
					ends_at: mockEvents[2]!.ends_at.toISOString(),
					doors_at: mockEvents[2]!.doors_at.toISOString(),
				},
			]);
		});
	});

	describe("with meta", () => {
		test("GET /api/v1/event/:id/meta", async () => {
			const response = await server.inject({
				method: "GET",
				url: "/api/v1/event/1/meta",
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({
				...baseMockEvent,
				created_at: metaData.created_at.toISOString(),
				updated_at: metaData.updated_at.toISOString(),
				created_by: metaData.created_by,
				updated_by: metaData.updated_by,
				starts_at: baseMockEvent.starts_at.toISOString(),
				ends_at: baseMockEvent.ends_at.toISOString(),
				doors_at: baseMockEvent.doors_at.toISOString(),
			});
		});

		test("returns 404 when meta event is not found", async () => {
			const response = await server.inject({
				method: "GET",
				url: "/api/v1/event/404/meta",
			});

			expect(response.statusCode).toBe(404);
			//expect(response.json()).toEqual({ error: "Not Found" });
		});
	});
});
