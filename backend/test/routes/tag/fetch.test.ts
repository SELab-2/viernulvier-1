import { describe, test, expect, beforeAll, vi, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { TagSchema, type Tag } from "@viernulvier/shared/index.js";

let server: FastifyInstance;
let sessionCookie: string;

const tag1: Tag = {
  id: 5,
  old_id: 111,
  name: { en: "Music", nl: "Muziek" },
  type: 1,
  productions: [1],
  public: true,
};

const tag2: Tag = {
  id: 6,
  old_id: 112,
  name: { en: "Family", nl: "Familie" },
  type: 1,
  productions: [1, 2],
  public: true,
};

const privateTag: Tag = {
  id: 10,
  old_id: 113,
  name: { en: "Private", nl: "Privé" },
  type: 1,
  productions: [1], // important for production tests
  public: false,
};

const tag1WithMeta = {
  ...tag1,
  created_at: new Date(),
  updated_at: new Date(),
  created_by: 1,
  updated_by: 1,
};

const mockTags: Tag[] = [tag1, tag2, privateTag];

beforeAll(async () => {
  server = await buildServer();

  sessionCookie = server.jwt.sign({ id: 1, username: "Admin" });

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    const id = params?.[0];
    const isMetaQuery = query.includes("created_at");
    const isVisibleQuery = query.includes("public = true");

    let rows;

    if (query.includes("production_tag")) {
      rows = mockTags.filter((t) =>
        t.productions.includes(Number(id)),
      );
    } else if (id) {
      rows = mockTags.filter((t) => t.id === Number(id));
    } else {
      rows = mockTags;
    }

    if (isVisibleQuery) {
      rows = rows.filter((t) => t.public);
    }

    if (isMetaQuery) {
      rows = rows.map((t) => ({
        ...t,
        created_at: tag1WithMeta.created_at,
        updated_at: tag1WithMeta.updated_at,
        created_by: 1,
        updated_by: 1,
      }));
    }

    return Promise.resolve({ rows, rowCount: rows.length });
  });
});

afterAll(async () => {
  await server.close();
});

describe("Fetch tag on id", () => {
  test("GET /api/v1/tags/:id/all", async () => {
    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tags/${tag1.id}/all`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.parse(response.json())).toEqual(tag1);
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

describe("Fetch visible tag on id", () => {

  test("GET /api/v1/tags/:id returns visible tag", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/tags/${tag1.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.parse(response.json())).toEqual(tag1);
  });

  test("GET /api/v1/tags/:id returns 404 when tag is not public", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/tags/${privateTag.id}`,
    });

    expect(response.statusCode).toBe(404);
  });

});

describe("Fetch tags", () => {
  test("GET /api/v1/tags/all", async () => {
    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tags/all`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.array().parse(response.json())).toEqual(mockTags);
  });
});

describe("Fetch visible tags", () => {

  test("GET /api/v1/tags returns only public tags", async () => {

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/tags`,
    });

    expect(response.statusCode).toBe(200);

    const result = TagSchema.array().parse(response.json());

    expect(result).toEqual(mockTags.filter((t) => t.public));
  });

});

describe("Fetch tags for production", () => {

  test("GET /api/v1/tags/all?production={id}", async () => {
    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tags/all?production=1`,
    });

    expect(response.statusCode).toBe(200);

    const result = TagSchema.array().parse(response.json());

    expect(result).toEqual(mockTags.filter((t) => t.productions.includes(1)));
  });

});

describe("Fetch visible tags for production", () => {

  test("GET /api/v1/tags?production={id}", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/tags?production=1`,
    });

    expect(response.statusCode).toBe(200);

    const result = TagSchema.array().parse(response.json());

    expect(result).toEqual(
      mockTags.filter((t) => t.public && t.productions.includes(1)),
    );
  });

});

describe("Fetch tag with metadata", () => {

  test("GET /api/v1/tags/:id/meta", async () => {

    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tags/${tag1WithMeta.id}/meta`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.withMeta().parse(response.json())).toEqual(tag1WithMeta);
  });

  test("GET returns 404 when tag not found", async () => {

    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tags/999/meta`,
    });

    expect(response.statusCode).toBe(404);
  });

});