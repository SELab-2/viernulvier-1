import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";

import tagRoutes from "@/routes/tag/tags.js";
import { TagSchema } from "@viernulvier/shared/index.js";

let server: FastifyInstance;

const tag = {
  id: 1,
  name: { nl: "Tag" },
  type: { id: 1, name: { nl: "Genre" }, visible: true },
  productions: [],
};

beforeAll(async () => {
  server = await buildServer();
  await server.register(tagRoutes);
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Fetch tag routes", () => {

  test("GET /api/v1/tag/:id -> returns tag", async () => {

    server.pg.query = vi.fn().mockResolvedValue({
      rows: [tag],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/tag/1",
    });

    expect(response.statusCode).toBe(200);

    const parsed = TagSchema.parse(response.json());
    expect(parsed).toEqual(tag);
  });

  test("GET /api/v1/tag -> returns tag list", async () => {

    server.pg.query = vi.fn().mockResolvedValue({
      rows: [tag],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/tag",
    });

    expect(response.statusCode).toBe(200);

    const parsed = response.json().map((t: unknown) => TagSchema.parse(t));
    expect(parsed.length).toBe(1);
  });

});