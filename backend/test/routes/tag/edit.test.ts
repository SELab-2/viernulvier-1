import { describe, test, expect, beforeAll, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { TagSchema, type Tag } from "@viernulvier/shared/index.js";

let server: FastifyInstance;

const mockTag: Tag = {
  id: 5,
  name: { en: "Music", nl: "Muziek" },
  type: 1,
  productions: [],
};

beforeAll(async () => {
  server = await buildServer();

  server.pg.query = vi.fn().mockResolvedValue({
    rows: [mockTag],
    rowCount: 1,
  });
});

afterAll(async () => {
  await server.close();
});

describe("Edit tag", () => {
  test("PATCH /api/v1/tag/:id name only", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tag/${mockTag.id}`,
      payload: { name: mockTag.name },
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.parse(response.json().body)).toEqual(mockTag);
  });

  test("PATCH /api/v1/tag/:id type only", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/tag/${mockTag.id}`,
      payload: { type: mockTag.type },
    });

    expect(response.statusCode).toBe(200);
  });
});