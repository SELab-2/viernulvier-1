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
		if (query.includes("UPDATE event_price")) {
			const id = Number(params?.[4]);
			const index = storedEventPrices.findIndex((p) => p.id === id);
			if (index === -1) return Promise.resolve({ rows: [] });

			const updated = {
				...storedEventPrices[index]!,
				event: params?.[0] ?? storedEventPrices[index]!.event,
				amount: Number(params?.[1]) ?? storedEventPrices[index]!.amount,
			};

			storedEventPrices[index] = updated;
			return Promise.resolve({ rows: [updated] });
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

describe("Event Price Edit Route", () => {
	test("updates amount of an event price", async () => {
		const response = await server.inject({
			method: "PATCH",
			url: "/event_price/1",
			cookies: { session: sessionCookie },
			payload: {
				amount: 29.99,
			},
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			id: 1,
			event: 10,
			amount: 29.99,
		});
	});

	test("updates event of an event price", async () => {
		const response = await server.inject({
			method: "PATCH",
			url: "/event_price/1",
			cookies: { session: sessionCookie },
			payload: {
				event: 20,
			},
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			id: 1,
			event: 20,
			amount: 25.50,
		});
	});

	test("updates multiple fields", async () => {
		const response = await server.inject({
			method: "PATCH",
			url: "/event_price/1",
			cookies: { session: sessionCookie },
			payload: {
				event: 20,
				amount: 40.00,
			},
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			id: 1,
			event: 20,
			amount: 40.00,
		});
	});

	test("returns 404 when event price not found", async () => {
		const response = await server.inject({
			method: "PATCH",
			url: "/event_price/999",
			cookies: { session: sessionCookie },
			payload: {
				amount: 29.99,
			},
		});

		expect(response.statusCode).toBe(404);
		expect(response.json()).toEqual({ error: "Not Found" });
	});

	test("returns 400 when payload is invalid", async () => {
		const response = await server.inject({
			method: "PATCH",
			url: "/event_price/1",
			cookies: { session: sessionCookie },
			payload: {
				amount: -5, // negative amount
			},
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toEqual({ error: "Invalid request data" });
	});

	test("requires authentication", async () => {
		const response = await server.inject({
			method: "PATCH",
			url: "/event_price/1",
			payload: {
				amount: 29.99,
			},
		});

		expect(response.statusCode).toBe(401);
	});
});
