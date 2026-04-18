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
  tag_type: 1,
  productions: [1],
  public: true,
};

const tag2: Tag = {
  id: 6,
  old_id: 112,
  name: { en: "Family", nl: "Familie" },
  tag_type: 1,
  productions: [1, 2],
  public: true,
};

const privateTag: Tag = {
  id: 10,
  old_id: 113,
  name: { en: "Private", nl: "Privé" },
  tag_type: 1,
  productions: [1], // important for production tests
  public: false,
};

/** Public tag with no production links — exercises `byTag.get(id) ?? []` when `includeProductions=true`. */
const tagNoLinks: Tag = {
  id: 42,
  old_id: 114,
  name: { en: "Concert", nl: "Concert" },
  tag_type: 1,
  productions: [],
  public: true,
};

const tag1WithMeta = {
  ...tag1,
  created_at: new Date(),
  updated_at: new Date(),
  created_by: 1,
  updated_by: 1,
};

const mockTags: Tag[] = [tag1, tag2, privateTag, tagNoLinks];

/** List responses omit `productions` unless `includeProductions=true`. */
const mockTagsListDefault: Tag[] = mockTags.map((t) => {
  const { productions: _, ...rest } = t;
  return rest;
});

function tagToDbRow(t: Tag) {
  return {
    id: t.id,
    old_id: t.old_id,
    name: t.name,
    tag_type: t.tag_type,
    public: t.public,
  };
}

beforeAll(async () => {
  server = await buildServer();

  sessionCookie = server.jwt.sign({ id: 1, username: "Admin" });

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    if (query.includes("tag = ANY")) {
      const raw = params?.[0];
      const ids = Array.isArray(raw) ? (raw as number[]) : [];
      const linkRows: { tag: number; production: number }[] = [];
      for (const t of mockTags) {
        if (ids.includes(t.id)) {
          for (const pid of t.productions ?? []) {
            linkRows.push({ tag: t.id, production: pid as number });
          }
        }
      }
      return Promise.resolve({ rows: linkRows, rowCount: linkRows.length });
    }

    const id = params?.[0];
    const isMetaQuery = query.includes("created_at");
    const isVisibleQuery = query.includes("public = true");

    let rows: ReturnType<typeof tagToDbRow>[] | Array<ReturnType<typeof tagToDbRow> & {
      created_at: Date;
      updated_at: Date;
      created_by: number;
      updated_by: number;
    }>;

    if (
      query.includes("FROM tag") &&
      query.includes("old_id = $1") &&
      query.includes("tag_type = $2")
    ) {
      const oldId = Number(params?.[0]);
      const tt = Number(params?.[1]);
      rows = mockTags
        .filter((t) => t.old_id === oldId && t.tag_type === tt)
        .map(tagToDbRow);
    } else if (query.includes("production_tag")) {
      rows = mockTags
        .filter((t) => (t.productions ?? []).includes(Number(id)))
        .map(tagToDbRow);
    } else if (id != null && !Array.isArray(id)) {
      rows = mockTags.filter((t) => t.id === Number(id)).map(tagToDbRow);
    } else {
      rows = mockTags.map(tagToDbRow);
    }

    if (isVisibleQuery) {
      rows = rows.filter((r) => r.public);
    }

    if (isMetaQuery) {
      rows = rows.map((r) => ({
        ...r,
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
  test("GET /api/v1/tag/:id/all", async () => {
    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tag/${tag1.id}/all`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.parse(response.json())).toEqual(tag1);
  });

  test("GET /api/v1/tag/:id/all returns 404 when tag not found", async () => {
    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tag/999/all`,
    });

    expect(response.statusCode).toBe(404);
  });

  test("GET /api/v1/tag/:id returns 404", async () => {
    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tag/999`,
    });

    expect(response.statusCode).toBe(404);
  });
});

describe("Fetch visible tag on id", () => {

  test("GET /api/v1/tag/:id returns visible tag", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/tag/${tag1.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.parse(response.json())).toEqual(tag1);
  });

  test("GET /api/v1/tag/:id returns 404 when tag is not public", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/tag/${privateTag.id}`,
    });

    expect(response.statusCode).toBe(404);
  });

});

describe("Fetch tags", () => {
  test("GET /api/v1/tag/all?includeProductions=true returns [] when no tags exist (no production_tag query)", async () => {
    const prev = server.pg.query;
    server.pg.query = vi.fn().mockImplementation((query: string) => {
      if (query.includes("tag = ANY")) {
        throw new Error("unexpected production_tag lookup with zero tag ids");
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tag/all?includeProductions=true`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
    server.pg.query = prev;
  });

  test("GET /api/v1/tag/all (productions omitted by default)", async () => {
    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tag/all`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.array().parse(response.json())).toEqual(mockTagsListDefault);
  });

  test("GET /api/v1/tag/all?old_id=&tag_type= filters by legacy id and type", async () => {
    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tag/all?old_id=${tag1.old_id}&tag_type=${tag1.tag_type}`,
    });

    expect(response.statusCode).toBe(200);
    const rows = TagSchema.array().parse(response.json());
    expect(rows).toEqual([{ ...tag1, productions: undefined }]);
  });

  test("GET /api/v1/tag/all?old_id= without tag_type is rejected", async () => {
    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tag/all?old_id=111`,
    });

    expect(response.statusCode).toBe(400);
  });

  test("GET /api/v1/tag/all?includeProductions=true", async () => {
    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tag/all?includeProductions=true`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.array().parse(response.json())).toEqual(mockTags);
  });
});

describe("Fetch visible tags", () => {

  test("GET /api/v1/tag returns only public tags (productions omitted by default)", async () => {

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/tag`,
    });

    expect(response.statusCode).toBe(200);

    const result = TagSchema.array().parse(response.json());

    expect(result).toEqual(mockTagsListDefault.filter((t) => t.public));
  });

  test("GET /api/v1/tag?includeProductions=true", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/tag?includeProductions=true`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.array().parse(response.json())).toEqual(
      mockTags.filter((t) => t.public),
    );
  });

  test("GET /api/v1/tag?old_id=&tag_type= returns public tags for that legacy pair", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/tag?old_id=${tag1.old_id}&tag_type=${tag1.tag_type}`,
    });

    expect(response.statusCode).toBe(200);
    const result = TagSchema.array().parse(response.json());
    expect(result).toEqual(
      mockTagsListDefault.filter((t) => t.public && t.old_id === tag1.old_id && t.tag_type === tag1.tag_type),
    );
  });

});

describe("Fetch tags for production", () => {

  test("GET /api/v1/tag/all?production={id} (productions omitted by default)", async () => {
    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tag/all?production=1`,
    });

    expect(response.statusCode).toBe(200);

    const result = TagSchema.array().parse(response.json());

    expect(result).toEqual(
      mockTags
        .filter((t) => (t.productions ?? []).includes(1))
        .map((t) => {
          const { productions: _, ...rest } = t;
          return rest;
        }),
    );
  });

  test("GET /api/v1/tag/all?production={id}&includeProductions=true", async () => {
    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tag/all?production=1&includeProductions=true`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.array().parse(response.json())).toEqual(
      mockTags.filter((t) => (t.productions ?? []).includes(1)),
    );
  });

});

describe("Fetch visible tags for production", () => {

  test("GET /api/v1/tag?production={id} (productions omitted by default)", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/tag?production=1`,
    });

    expect(response.statusCode).toBe(200);

    const result = TagSchema.array().parse(response.json());

    expect(result).toEqual(
      mockTags
        .filter((t) => t.public && (t.productions ?? []).includes(1))
        .map((t) => {
          const { productions: _, ...rest } = t;
          return rest;
        }),
    );
  });

  test("GET /api/v1/tag?production={id}&includeProductions=true", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/tag?production=1&includeProductions=true`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.array().parse(response.json())).toEqual(
      mockTags.filter((t) => t.public && (t.productions ?? []).includes(1)),
    );
  });

});

describe("Fetch tag with metadata", () => {

  test("GET /api/v1/tag/:id/meta", async () => {

    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tag/${tag1WithMeta.id}/meta`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.withMeta().parse(response.json())).toEqual(tag1WithMeta);
  });

  test("GET /api/v1/tag/:id/meta includes empty productions when tag has no production_tag rows", async () => {
    const prev = server.pg.query;
    server.pg.query = vi.fn().mockImplementation((query: string, _params?: unknown[]) => {
      if (query.includes("tag = ANY")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (query.includes("created_at")) {
        return Promise.resolve({
          rows: [
            {
              ...tagToDbRow(tag1),
              created_at: tag1WithMeta.created_at,
              updated_at: tag1WithMeta.updated_at,
              created_by: 1,
              updated_by: 1,
            },
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tag/${tag1.id}/meta`,
    });

    expect(response.statusCode).toBe(200);
    expect(TagSchema.withMeta().parse(response.json())).toEqual({
      ...tag1WithMeta,
      productions: [],
    });
    server.pg.query = prev;
  });

  test("GET returns 404 when tag not found", async () => {

    const response = await server.inject({
      method: "GET",
      cookies: { session: sessionCookie },
      url: `/api/v1/tag/999/meta`,
    });

    expect(response.statusCode).toBe(404);
  });

});
