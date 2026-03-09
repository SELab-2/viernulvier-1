import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";

import tagTypeRoutes from "@/routes/tag_type/tag_types.js";
import { TagTypeSchema } from "@viernulvier/shared/index.js";

let server: FastifyInstance;

const tagType = {
  id: 1,
  name: { nl: "Genre" },
  visible: true,
};

beforeAll(async () => {
  server = await buildServer();
  await server.register(tagTypeRoutes);
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Fetch tag type routes", () => {

  test("GET /api/v1/tag-type/:id -> returns tag type", async () => {

    server.pg.query = vi.fn().mockResolvedValue({
      rows: [tagType],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/tag-type/1",
    });

    expect(response.statusCode).toBe(200);

    const parsed = TagTypeSchema.parse(response.json());
    expect(parsed).toEqual(tagType);
  });

  test("GET /api/v1/tag-type -> returns tag type list", async () => {

    server.pg.query = vi.fn().mockResolvedValue({
      rows: [tagType],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/tag-type",
    });

    expect(response.statusCode).toBe(200);

    const parsed = response.json().map((t: unknown) => TagTypeSchema.parse(t));
    expect(parsed.length).toBe(1);
  });

});