import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { HallSchema, type Hall } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

const originalHall: Hall = {
  id: 1,
  old_id: 111,
  name: { nl: "Grote Zaal" },
  address: "Sint-Pietersnieuwstraat 23",
};

const updatedHallA: Hall = {
  ...originalHall,
  name: { nl: "Nieuwe Naam" },
  address: "Nieuw Adres 1",
};

const updatedHallB: Hall = {
  ...originalHall,
  name: { nl: "Naam B" },
};

const updatedHallC: Hall = {
  ...originalHall,
  old_id: 999,
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

  test("PATCH /api/v1/hall/:id — updates name", async () => {
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
        name: updatedHallB["name"],
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
        name: "geen object",
      },
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("PATCH /api/v1/hall/:id — rejects empty body", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/hall/${originalHall["id"]}`,
      cookies: { session: sessionCookie },
      payload: {},
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("PATCH /api/v1/hall/:id — updates old_id", async () => {
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      const upper = query.trim().toUpperCase();

      if (upper.startsWith("UPDATE")) {
        return Promise.resolve({ rows: [updatedHallC], rowCount: 1 });
      }

      throw new Error(`Unexpected query in edit tests: ${query}`);
    });

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/hall/${originalHall["id"]}`,
      cookies: { session: sessionCookie },
      payload: {
        old_id: 999,
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(HallSchema.parse(response.json())).toEqual(updatedHallC);
  });
});
