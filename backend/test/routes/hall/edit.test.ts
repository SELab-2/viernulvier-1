import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { HallSchema, type Hall } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";
import { editHall } from "@/routes/hall/handlers/edit.js";

let server: FastifyInstance;
let sessionCookie: string;

const originalHall: Hall = {
  id: 1,
  name: { nl: "Grote Zaal" },
  address: "Sint-Pietersnieuwstraat 23",
  vendor_id: 42,
};

const updatedHallA: Hall = {
  ...originalHall,
  name: { nl: "Nieuwe Naam" },
  address: "Nieuw Adres 1",
};

const updatedHallB: Hall = {
  ...originalHall,
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

describe("Edit on hall route", () => {
  test("PATCH /api/v1/hall/:id — updates name and address", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [updatedHallA], rowCount: 1 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/hall/${originalHall["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        name: updatedHallA["name"],
        address: updatedHallA["address"],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(HallSchema.parse(response.json())).toEqual(updatedHallA);
  });

  test("PATCH /api/v1/hall/:id — updates vendor_id", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [updatedHallB], rowCount: 1 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/hall/${originalHall["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        vendor_id: updatedHallB["vendor_id"],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(HallSchema.parse(response.json())).toEqual(updatedHallB);
  });

  test("PATCH /api/v1/hall/:id — returns 404 when hall not found", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/hall/${originalHall["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        name: { nl: "Niet bestaand" },
      },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("PATCH /api/v1/hall/:id — returns 401 when not logged in", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/hall/${originalHall["id"]}`,
      payload: {
        name: { nl: "Nieuwe naam" },
      },
    });

    expect(response.statusCode).toBe(HttpClientError.Unauthorized);
  });

  test("PATCH /api/v1/hall/:id — rejects invalid body", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/hall/${originalHall["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        vendor_id: "geen nummer",
      },
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("editHall() — ignores explicitly undefined fields", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [originalHall], rowCount: 1 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const result = await editHall(server, {
      params: { id: String(originalHall["id"]) },
      body: { name: undefined },
      user: { id: 1 },
    } as any);

    expect(result).toEqual(originalHall);
  });
});
