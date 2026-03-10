import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { HallSchema, type Hall } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";

let server: FastifyInstance;
let sessionCookie: string;

const replacedHall: Hall = {
  id: 1,
  name: { nl: "Nieuwe Grote Zaal" },
  address: "Nieuw Adres 1",
  vendor_id: 99,
};

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin1" });
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Replace on hall route", () => {
  test("PUT /api/v1/hall/:id — replaces a hall and returns it", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [replacedHall], rowCount: 1 });
      }

      throw new Error(`Unexpected query in replace tests: ${query}`);
    });

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/hall/${replacedHall["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        name: replacedHall["name"],
        address: replacedHall["address"],
        vendor_id: replacedHall["vendor_id"],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(HallSchema.parse(response.json())).toEqual(replacedHall);
  });

  test("PUT /api/v1/hall/:id — returns 404 when hall not found", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/hall/${replacedHall["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        name: replacedHall["name"],
        address: replacedHall["address"],
        vendor_id: replacedHall["vendor_id"],
      },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("PUT /api/v1/hall/:id — rejects invalid body", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/hall/${replacedHall["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        name: replacedHall["name"],
      },
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("PUT /api/v1/hall/:id — returns 401 when not logged in", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/hall/${replacedHall["id"]}`,
      payload: {
        name: replacedHall["name"],
        address: replacedHall["address"],
        vendor_id: replacedHall["vendor_id"],
      },
    });

    expect(response.statusCode).toBe(HttpClientError.Unauthorized);
  });
});
