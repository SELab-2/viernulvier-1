import { describe, test, expect, beforeAll, beforeEach, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { HallSchema, type Hall } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";

let server: FastifyInstance;
let sessionCookie: string;

const mockHall: Hall = { id: 1, name: { nl: "Grote Zaal" }, address: "Sint-Pietersnieuwstraat 23", vendor_id: 42 };

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

describe("Delete on hall route", () => {
  test("DELETE /api/v1/hall/:id — deletes a hall and returns it", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [mockHall], rowCount: 1 });

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/hall/${mockHall?.["id"]}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(HallSchema.parse(response.json().body)).toEqual(mockHall);
  });

  test("DELETE /api/v1/hall/:id — returns 404 when hall not found", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/hall/${mockHall?.["id"]}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("DELETE /api/v1/hall/:id — returns 401 when not logged in", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/hall/${mockHall?.["id"]}`,
    });

    expect(response.statusCode).toBe(HttpClientError.Unauthorized);
  });
});
