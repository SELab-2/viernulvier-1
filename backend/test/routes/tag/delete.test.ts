import { describe, test, expect, beforeAll, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { TagSchema, type Tag } from "@viernulvier/shared/index.js";

vi.mock("@/plugins/authorize.js", () => import("@mocks/plugins/authorize.js"));

let server: FastifyInstance;
let sessionCookie: string;


const mockTag: Tag = {
  id: 5,
  old_id: 111,
  name: { en: "Music", nl: "Muziek" },
  tag_type: 1,
  productions: [],
  public: true,
};

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "Admin" });

});

afterAll(async () => {
  await server.close();
});

describe("Delete tag", () => {
  test("DELETE /api/v1/tag/:id", async () => {
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [mockTag],
      rowCount: 1,
    });

    const response = await server.inject({
      method: "DELETE",
      cookies: { session: sessionCookie },
      url: `/api/v1/tag/${mockTag.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.parse(response.json())).toEqual(mockTag);
  });

  test("DELETE /api/v1/tag/:id returns 404", async () => {
    server.pg.query = vi.fn().mockResolvedValue({
      rows: [],
      rowCount: 0,
    });

    const response = await server.inject({
      method: "DELETE",
      cookies: { session: sessionCookie },
      url: `/api/v1/tag/${mockTag.id}`,
    });

    expect(response.statusCode).toBe(404);
  });
});