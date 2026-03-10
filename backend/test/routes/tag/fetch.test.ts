import { describe, test, expect, beforeAll, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { TagSchema, type Tag } from "@viernulvier/shared/index.js";

let server: FastifyInstance;
const tag1: Tag = {
  id: 5,
  name: { en: "Music", nl: "Muziek" },
  type: 1,
  productions: [],
};

const mockTags: Tag[] = [
  tag1,
  {
    id: 6,
    name: { en: "Family", nl: "Familie" },
    type: 1,
    productions: [],
  },
];

beforeAll(async () => {
  server = await buildServer();
  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    const id = params?.[0];

    const rows = id
      ? mockTags.filter((t) => t.id === Number(id))
      : mockTags;

    return Promise.resolve({ rows, rowCount: rows.length });
  });
});

afterAll(async () => {
  await server.close();
});

describe("Fetch tags", () => {
  test("GET /api/v1/tag/:id", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/tag/${mockTags[0]!.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.parse(response.json())).toEqual(mockTags[0]);
  });

  test("GET /api/v1/tag/:id returns 404", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/tag/999`,
    });

    expect(response.statusCode).toBe(404);
  });
});