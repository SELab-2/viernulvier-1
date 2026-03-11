import { describe, test, expect, beforeAll, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { TagSchema, type Tag } from "@viernulvier/shared/index.js";

let server: FastifyInstance;
let sessionCookie: string;


const tag1: Tag = {
  id: 5,
  name: { en: "Music", nl: "Muziek" },
  type: 1,
  productions: [1],
  public: true,
};

const mockTags: Tag[] = [
  tag1,
  {
    id: 6,
    name: { en: "Family", nl: "Familie" },
    type: 1,
    productions: [1,2],
    public: true,
  },
];

beforeAll(async () => {
  server = await buildServer();

  sessionCookie = server.jwt.sign({ id: 1, username: "Admin" });

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    const id = params?.[0];

    let rows;

    if (query.includes("production_tag")) {
      rows = mockTags.filter((t) =>
        t.productions.includes(Number(id))
      );
    } else if (id) {
      rows = mockTags.filter((t) => t.id === Number(id));
    } else {
      rows = mockTags;
    }

    return Promise.resolve({ rows, rowCount: rows.length });
  });
});

afterAll(async () => {
  await server.close();
});

describe("Fetch tag on id", () => {
  test("GET /api/v1/tags/:id", async () => {
    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tags/${mockTags[0]!.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.parse(response.json())).toEqual(mockTags[0]);
  });

  test("GET /api/v1/tags/:id returns 404", async () => {
    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tags/999`,
    });

    expect(response.statusCode).toBe(404);
  });
});


describe("Fetch tags", () => {
  test("GET /api/v1/tags", async () => {
    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tags`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.array().parse(response.json())).toEqual(mockTags);
  });
});

describe("Fetch tags for production", () => {
  test("GET /api/v1/tags?production={id}", async () => {
    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tags?production=1`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.array().parse(response.json())).toEqual(mockTags);
  });
});