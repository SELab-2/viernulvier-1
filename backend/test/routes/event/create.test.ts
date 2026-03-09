import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildServer } from "@/server.js";

let server: FastifyInstance;
let queryMock: ReturnType<typeof vi.fn>;

const basePayload = {
	id: 1,
	starts_at: new Date("2026-01-01T18:00:00.000Z"),
	ends_at: new Date("2026-01-01T20:00:00.000Z"),
	production: 10,
	hall: 3,
	doors_at: new Date("2026-01-01T17:30:00.000Z"),
	vendor_id: 42,
	info: { nl: "Info mock create" },
	price: [1],
};

function buildPayload(vendorId: number) {
	return {
		...basePayload,
		vendor_id: vendorId,
	};
}

beforeAll(async () => {
	server = await buildServer();

	queryMock = vi.fn().mockImplementation((_query: string, params?: unknown[]) => {
		const vendorId = params?.[5];
		if (vendorId === 404) return Promise.resolve({ rows: [] });
		return Promise.resolve({ rows: [basePayload] });
	});
	server.pg.query = queryMock;
});

afterAll(async () => {
	await server.close();
});

beforeEach(() => {
	vi.clearAllMocks();
});

describe("Event Create Routes", () => {
	describe("create event", () => {
		test("creates event from JSON payload with ISO date strings", async () => {
			const response = await server.inject({
				method: "POST",
				url: "/api/v1/event",
				payload: buildPayload(42),
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({
				...basePayload,
				starts_at: basePayload.starts_at.toISOString(),
				ends_at: basePayload.ends_at.toISOString(),
				doors_at: basePayload.doors_at.toISOString(),
			});
			expect(queryMock).toHaveBeenCalledOnce();
			const params = queryMock.mock.calls[0]?.[1] as unknown[];
			expect(params[0]).toBeInstanceOf(Date);
			expect(params[1]).toBeInstanceOf(Date);
			expect(params[4]).toBeInstanceOf(Date);
		});

		test("returns 400 when request payload is invalid", async () => {
			const response = await server.inject({
				method: "POST",
				url: "/api/v1/event",
				payload: {
					id: 1,
					vendor_id: 42,
				},
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toEqual({ error: "Invalid request data" });
			expect(queryMock).not.toHaveBeenCalled();
		});

		test("returns 404 when created row is not returned", async () => {
			const response = await server.inject({
				method: "POST",
				url: "/api/v1/event",
				payload: buildPayload(404),
			});

			expect(response.statusCode).toBe(404);
			expect(response.json()).toEqual({ error: "Not Found" });
		});
	});
});
