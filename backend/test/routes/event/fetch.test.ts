import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildServer } from "@/server.js";

let server: FastifyInstance;

const baseMockEvent = {
	id: 1,
	starts_at: new Date("2026-01-01T18:00:00.000Z"),
	ends_at: new Date("2026-01-01T20:00:00.000Z"),
	production: 10,
	hall: 3,
	doors_at: new Date("2026-01-01T17:30:00.000Z"),
	vendor_id: 42,
	info: { nl: "Info mock 1" },
	price: [1],
};

const mockEventWithMeta = {
	...baseMockEvent,
	created_at: new Date("2025-12-31T09:00:00.000Z"),
	updated_at: new Date("2026-01-01T09:00:00.000Z"),
	created_by: 7,
	updated_by: 8,
};

const mockEvents: [typeof baseMockEvent, ...typeof baseMockEvent[]] = [
	baseMockEvent,
	{ ...baseMockEvent, id: 2, production: 11, hall: 4, info: { nl: "Info mock 2" }, price: [2] },
	{ ...baseMockEvent, id: 3, production: 12, hall: 5, info: { nl: "Info mock 3" }, price: [3] },
];

const mockInvalidEvent = {
	...baseMockEvent,
    id: 500,
	doors_at: "invalid-date",
};

beforeAll(async () => {
	server = await buildServer();

	server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
		if (params?.includes("500")) {
			return Promise.resolve({ rows: [mockInvalidEvent] });
		}

		if (params?.includes("404")) {
			return Promise.resolve({ rows: [] });
		}

		if (query.includes("created_at") && params?.includes("1")) {
			return Promise.resolve({ rows: [mockEventWithMeta] });
		}

		if (params?.includes("1")) {
			return Promise.resolve({ rows: [baseMockEvent] });
		}

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
			expect(response.json()).toEqual({ error: "Not Found" });
		});

		test("returns 500 when database row is invalid", async () => {
			const response = await server.inject({
				method: "GET",
				url: "/api/v1/event/500",
			});

			expect(response.statusCode).toBe(500);
			expect(response.json()).toEqual({ error: "Internal server error" });
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
					starts_at: mockEvents[0].starts_at.toISOString(),
					ends_at: mockEvents[0].ends_at.toISOString(),
					doors_at: mockEvents[0].doors_at.toISOString(),
				},
				{
					...mockEvents[1],
					starts_at: mockEvents[1].starts_at.toISOString(),
					ends_at: mockEvents[1].ends_at.toISOString(),
					doors_at: mockEvents[1].doors_at.toISOString(),
				},
				{
					...mockEvents[2],
					starts_at: mockEvents[2].starts_at.toISOString(),
					ends_at: mockEvents[2].ends_at.toISOString(),
					doors_at: mockEvents[2].doors_at.toISOString(),
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
				created_at: mockEventWithMeta.created_at.toISOString(),
				updated_at: mockEventWithMeta.updated_at.toISOString(),
				created_by: mockEventWithMeta.created_by,
				updated_by: mockEventWithMeta.updated_by,
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
			expect(response.json()).toEqual({ error: "Not Found" });
		});
	});
});
