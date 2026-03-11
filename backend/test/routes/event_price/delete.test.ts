import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildServer } from "@/server.js";
import type { EventPrice } from "@viernulvier/shared/index.js";

let server: FastifyInstance;
let storedEventPrices: EventPrice[];
let sessionCookie: string;

const baseEventPrice: EventPrice = {
	id: 1,
	event: 10,
	amount: 25.50,
};

const initialEventPrices: EventPrice[] = [
	baseEventPrice,
	{ id: 2, event: 11, amount: 30.00 },
	{ id: 3, event: 12, amount: 22.75 },
	{ id: 4, event: 10, amount: 15.00 },
];

beforeAll(async () => {
	server = await buildServer();
	sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });

	server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
		if (query.includes("DELETE FROM event_price")) {
			const id = Number(params?.[0]);
			const deleted = storedEventPrices.find((p) => p.id === id);
			if (!deleted) return Promise.resolve({ rows: [] });

			storedEventPrices = storedEventPrices.filter((p) => p.id !== id);
			return Promise.resolve({ rows: [deleted] });
		}

		if (query.includes("FROM event_price WHERE id = $1")) {
			const id = Number(params?.[0]);
			const price = storedEventPrices.find((p) => p.id === id);
			return Promise.resolve({ rows: price ? [price] : [] });
		}

		return Promise.resolve({ rows: [] });
	});
});

afterAll(async () => {
	await server.close();
});

beforeEach(() => {
	vi.clearAllMocks();
	storedEventPrices = structuredClone(initialEventPrices);
});

describe("Event Price Delete Route", () => {
	test("deletes an event price by ID", async () => {
		const response = await server.inject({
			method: "DELETE",
			url: "/event_price/1",
			cookies: { session: sessionCookie },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			id: 1,
			event: 10,
			amount: 25.50,
		});

		// Verify it's actually deleted
		const getResponse = await server.inject({
			method: "GET",
			url: "/event_price/1",
		});

		expect(getResponse.statusCode).toBe(404);
	});

	test("returns 404 when event price not found", async () => {
		const response = await server.inject({
			method: "DELETE",
			url: "/event_price/999",
			cookies: { session: sessionCookie },
		});

		expect(response.statusCode).toBe(404);
		expect(response.json()).toEqual({ error: "Not Found" });
	});

	test("requires authentication", async () => {
		const response = await server.inject({
			method: "DELETE",
			url: "/event_price/1",
		});

		expect(response.statusCode).toBe(401);
	});
});
