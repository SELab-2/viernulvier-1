import { describe, test, expect, beforeAll, beforeEach, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { HallSchema, type Hall } from "@viernulvier/shared/index.js";
import { HttpSuccess, HttpClientError } from "@/routes/helpers.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;

const mockHall: Hall = { id: 1, old_id: 111, name: { nl: "Grote Zaal" }, address: "Sint-Pietersnieuwstraat 23" };

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

describe("Create on hall route", () => {
  test("POST /api/v1/hall — creates a hall and returns it", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [mockHall], rowCount: 1 });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/hall",
      cookies: { session: sessionCookie },
      payload: {
        old_id: 111,
        name: { nl: "Grote Zaal" },
        address: "Sint-Pietersnieuwstraat 23",
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(HallSchema.parse(response.json())).toEqual(mockHall);
  });

  test("POST /api/v1/hall — returns 404 when insert returns no row", async () => {
    server.pg.query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/hall",
      cookies: { session: sessionCookie },
      payload: {
        old_id: 111,
        name: { nl: "Grote Zaal" },
        address: "Sint-Pietersnieuwstraat 23",
      },
    });

    expect(response.statusCode).toBe(HttpClientError.NotFound);
  });

  test("POST /api/v1/hall — rejects invalid body", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/hall",
      cookies: { session: sessionCookie },
      payload: {},
    });

    expect(response.statusCode).toBe(HttpClientError.BadRequest);
  });

  test("POST /api/v1/hall — returns 401 when not logged in", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/hall",
      payload: {
        old_id: 111,
        name: { nl: "Grote Zaal" },
        address: "Sint-Pietersnieuwstraat 23",
      },
    });

    expect(response.statusCode).toBe(HttpClientError.Unauthorized);
  });
});