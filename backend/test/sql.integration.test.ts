import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { HallSchema, AdminSchema, BlogSchema, BlogPostSchema, BlogPostWithBackwardsRefsSchema, ProductionSchema, ProductionSchemaWithBackwardsRefs, EventSchema, EventPriceSchema, TagSchema, TagTypeSchema } from "@viernulvier/shared/index.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { migrate } from "@/db/migrate.js";
import { hashPassword } from "@/routes/auth/handlers/hash.js";

let server: FastifyInstance;
let sessionCookie: string;
let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  process.env["DATABASE_URL"] = container.getConnectionUri();
  process.env["JWT_SECRET"] ??= "test-secret";

  await migrate();

  server = await buildServer();

  // Seed superadmin
  const hash = await hashPassword("password");
  await server.pg.query(
    `INSERT INTO admin (username, password, super, created_at, updated_at)
     VALUES ($1, $2, TRUE, NOW(), NOW())`,
    ["superadmin", hash],
  );
  await server.pg.query(
    `UPDATE admin SET created_by = id, updated_by = id WHERE username = $1`,
    ["superadmin"],
  );

  // Log in to get a real session cookie (and also test the login SQL at the same time)
  const loginResponse = await server.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { username: "superadmin", password: "password" },
  });
  sessionCookie = loginResponse.cookies.find((c) => c.name === "session")!.value;
}, 60_000);

afterAll(async () => {
  await server.close();
  await container.stop();
});

describe("Auth routes — SQL integration", { sequential: true }, () => {
  let adminId: number;

  test("POST /api/v1/auth — creates a new admin", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/auth",
      cookies: { session: sessionCookie },
      payload: { username: "testadmin", password: "password123", super: false },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const admin = AdminSchema.parse(response.json());
    expect(admin).toMatchObject({ username: "testadmin", super: false });

    adminId = admin.id;
  });

  test("GET /api/v1/auth — returns a list containing the created admin", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth",
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const admins = response.json<unknown[]>();
    expect(admins.some((a) => AdminSchema.parse(a).id === adminId)).toBe(true);
  });

  test("GET /api/v1/auth/:id — returns the created admin", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/auth/${adminId}`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(AdminSchema.parse(response.json())).toMatchObject({ id: adminId, username: "testadmin" });
  });

  test("GET /api/v1/auth/:id/meta — returns the admin with metadata", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/auth/${adminId}/meta`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(AdminSchema.withMeta().parse(response.json())).toMatchObject({ id: adminId });
  });

  test("GET /api/v1/auth/me — returns the currently logged in admin", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(AdminSchema.parse(response.json())).toMatchObject({ username: "superadmin" });
  });

  test("GET /api/v1/auth/me/meta — returns the currently logged in admin with metadata", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/auth/me/meta",
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(AdminSchema.withMeta().parse(response.json())).toMatchObject({ username: "superadmin" });
  });

  test("PATCH /api/v1/auth/:id — updates only the supplied fields", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/auth/${adminId}`,
      cookies: { session: sessionCookie },
      payload: { username: "patchedadmin" },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const admin = AdminSchema.parse(response.json());
    expect(admin.username).toBe("patchedadmin");
    expect(admin.super).toBe(false); // unchanged
  });

  test("PATCH /api/v1/auth/me — updates own password", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/auth/me`,
      cookies: { session: sessionCookie },
      payload: { oldPassword: "password", newPassword: "hello123" },
    });

    expect(response.statusCode).toBe(HttpSuccess.NoContent);
    expect(response.body).toEqual("");
  });

  test("PUT /api/v1/auth/:id — replaces all fields of the admin", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/auth/${adminId}`,
      cookies: { session: sessionCookie },
      payload: { username: "replacedadmin", password: "newpassword123", super: true },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(AdminSchema.parse(response.json())).toMatchObject({
      id: adminId,
      username: "replacedadmin",
      super: true,
    });
  });

  test("DELETE /api/v1/auth/:id — removes the admin from the database", async () => {
    const deleteResponse = await server.inject({
      method: "DELETE",
      url: `/api/v1/auth/${adminId}`,
      cookies: { session: sessionCookie },
    });
    expect(deleteResponse.statusCode).toBe(HttpSuccess.OK);

    const fetchResponse = await server.inject({
      method: "GET",
      url: `/api/v1/auth/${adminId}`,
      cookies: { session: sessionCookie },
    });
    expect(fetchResponse.statusCode).not.toBe(HttpSuccess.OK);
  });
});

describe("Hall routes — SQL integration", { sequential: true }, () => {
  let hallId: number;

  test("POST /api/v1/hall — inserts and returns a new hall", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/hall",
      cookies: { session: sessionCookie },
      payload: { old_id: 111, name: { nl: "Grote Zaal" }, address: "Sint-Pietersnieuwstraat 23" },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const hall = HallSchema.parse(response.json());
    expect(hall).toMatchObject({ old_id: 111, name: { nl: "Grote Zaal" } });

    hallId = hall.id;
  });

  test("GET /api/v1/hall — returns a list containing the created hall", async () => {
    const response = await server.inject({ method: "GET", url: "/api/v1/hall" });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const halls = response.json<unknown[]>();
    expect(halls.some((h) => HallSchema.parse(h).id === hallId)).toBe(true);
  });

  test("GET /api/v1/hall/:id — returns the created hall", async () => {
    const response = await server.inject({ method: "GET", url: `/api/v1/hall/${hallId}` });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(HallSchema.parse(response.json())).toMatchObject({ id: hallId, name: { nl: "Grote Zaal" } });
  });

  test("GET /api/v1/hall/:id/meta — returns the hall with metadata", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/hall/${hallId}/meta`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(HallSchema.withMeta().parse(response.json())).toMatchObject({ id: hallId });
  });

  test("PATCH /api/v1/hall/:id — updates only the supplied fields", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/hall/${hallId}`,
      cookies: { session: sessionCookie },
      payload: { address: "Koningin Astridlaan 1" },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const hall = HallSchema.parse(response.json());
    expect(hall.address).toBe("Koningin Astridlaan 1");
    expect(hall.name).toEqual({ nl: "Grote Zaal" }); // unchanged
  });

  test("PUT /api/v1/hall/:id — replaces all fields of the hall", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/hall/${hallId}`,
      cookies: { session: sessionCookie },
      payload: { old_id: 333, name: { nl: "Nieuwe Zaal", fr: "Nouvelle Salle" }, address: "Goudstraat 2" },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(HallSchema.parse(response.json())).toMatchObject({
      id: hallId,
      old_id: 333,
      name: { nl: "Nieuwe Zaal", fr: "Nouvelle Salle" },
      address: "Goudstraat 2",
    });
  });

  test("DELETE /api/v1/hall/:id — removes the hall from the database", async () => {
    const deleteResponse = await server.inject({
      method: "DELETE",
      url: `/api/v1/hall/${hallId}`,
      cookies: { session: sessionCookie },
    });
    expect(deleteResponse.statusCode).toBe(HttpSuccess.OK);

    const fetchResponse = await server.inject({ method: "GET", url: `/api/v1/hall/${hallId}` });
    expect(fetchResponse.statusCode).not.toBe(HttpSuccess.OK);
  });
});

describe("Blog routes — SQL integration", { sequential: true }, () => {
  let blogId: number;

  test("POST /api/v1/blog — inserts and returns a new blog", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog",
      cookies: { session: sessionCookie },
      payload: { name: { en: "Test Blog" }, description: { en: "A test description" } },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const blog = BlogSchema.parse(response.json());
    expect(blog).toMatchObject({ name: { en: "Test Blog" }, description: { en: "A test description" } });

    blogId = blog.id;
  });

  test("GET /api/v1/blog — returns a list containing the created blog", async () => {
    const response = await server.inject({ method: "GET", url: "/api/v1/blog" });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const blogs = response.json<unknown[]>();
    expect(blogs.some((b) => BlogSchema.parse(b).id === blogId)).toBe(true);
  });

  test("GET /api/v1/blog/:id — returns the created blog", async () => {
    const response = await server.inject({ method: "GET", url: `/api/v1/blog/${blogId}` });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogSchema.parse(response.json())).toMatchObject({ id: blogId, name: { en: "Test Blog" } });
  });

  test("GET /api/v1/blog/:id/meta — returns the blog with metadata", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/blog/${blogId}/meta`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogSchema.withMeta().parse(response.json())).toMatchObject({ id: blogId });
  });

  test("PATCH /api/v1/blog/:id — updates only the supplied fields", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/${blogId}`,
      cookies: { session: sessionCookie },
      payload: { description: { en: "Updated description" } },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const blog = BlogSchema.parse(response.json());
    expect(blog.description).toStrictEqual( { en: "Updated description" } );
    expect(blog.name).toStrictEqual( { en: "Test Blog" } ); // unchanged
  });

  test("PUT /api/v1/blog/:id — replaces all fields of the blog", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/blog/${blogId}`,
      cookies: { session: sessionCookie },
      payload: { name: { en: "Replaced Blog" }, description: null },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogSchema.parse(response.json())).toMatchObject({
      id: blogId,
      name: { en: "Replaced Blog" },
      description: null,
    });
  });

  test("DELETE /api/v1/blog/:id — removes the blog from the database", async () => {
    const deleteResponse = await server.inject({
      method: "DELETE",
      url: `/api/v1/blog/${blogId}`,
      cookies: { session: sessionCookie },
    });
    expect(deleteResponse.statusCode).toBe(HttpSuccess.OK);

    const fetchResponse = await server.inject({ method: "GET", url: `/api/v1/blog/${blogId}` });
    expect(fetchResponse.statusCode).not.toBe(HttpSuccess.OK);
  });
});

describe("BlogPost routes — SQL integration", { sequential: true }, () => {
  let blogId: number;
  let blogPostId: number;
  let productionId1: number;
  let productionId2: number;

  beforeAll(async () => {
    // Create blog
    const blogResponse = await server.inject({
      method: "POST",
      url: "/api/v1/blog",
      cookies: { session: sessionCookie },
      payload: { name: { en: "BlogPost Test Blog" }, description: null },
    });

    expect(blogResponse.statusCode).toBe(HttpSuccess.OK);
    blogId = BlogSchema.parse(blogResponse.json()).id;

    // Create test productions for blogpost to link to
    const prod1Response = await server.inject({
      method: "POST",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
      payload: {
        title: { nl: "BlogPost Test Production 1" },
        artist: { nl: "Test Artist" },
        tagline: { nl: "Test tagline" },
        teaser: { nl: "Test teaser" },
        finalized: false,
      },
    });
    expect(prod1Response.statusCode).toBe(HttpSuccess.OK);
    productionId1 = prod1Response.json().id;

    const prod2Response = await server.inject({
      method: "POST",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
      payload: {
        title: { nl: "BlogPost Test Production 2" },
        artist: { nl: "Test Artist" },
        tagline: { nl: "Test tagline" },
        teaser: { nl: "Test teaser" },
        finalized: false,
      },
    });
    expect(prod2Response.statusCode).toBe(HttpSuccess.OK);
    productionId2 = prod2Response.json().id;
  });

  afterAll(async () => {
    // Clean up blog (blogpost cascade deletes)
    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/blog/${blogId}`,
      cookies: { session: sessionCookie },
    });
    expect(response.statusCode).toBe(HttpSuccess.OK);

    // Clean up productions
    await server.inject({
      method: "DELETE",
      url: `/api/v1/production/${productionId1}`,
      cookies: { session: sessionCookie },
    });
    await server.inject({
      method: "DELETE",
      url: `/api/v1/production/${productionId2}`,
      cookies: { session: sessionCookie },
    });
  });

  test("POST /api/v1/blog/post — inserts and returns a new blogpost with productions", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/blog/post",
      cookies: { session: sessionCookie },
      payload: {
        blog: blogId,
        title: { en: "Test Post" },
        content: { en: "Hello world" },
        published_at: new Date().toISOString(),
        productions: [productionId1, productionId2],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const post = BlogPostWithBackwardsRefsSchema.parse(response.json());
    expect(post).toMatchObject({ blog: blogId, title: { en: "Test Post" } });
    expect(post.productions).toEqual([productionId1, productionId2]);
    blogPostId = post.id;
  });

  test("GET /api/v1/blog/post — returns a list containing the created blogpost", async () => {
    const response = await server.inject({ method: "GET", url: "/api/v1/blog/post" });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const posts = response.json<unknown[]>();
    expect(posts.some((p) => BlogPostWithBackwardsRefsSchema.parse(p).id === blogPostId)).toBe(true);
  });

  test("GET /api/v1/blog/post — does not return draft posts (published_at IS NULL)", async () => {
    const draftResponse = await server.inject({
      method: "POST",
      url: "/api/v1/blog/post",
      cookies: { session: sessionCookie },
      payload: {
        blog: blogId,
        title: { en: "Draft Post" },
        content: { en: "Not yet published" },
        published_at: null,
        productions: [productionId1],
      },
    });
    expect(draftResponse.statusCode).toBe(HttpSuccess.OK);
    const draftPost = BlogPostWithBackwardsRefsSchema.parse(draftResponse.json());
    expect(draftPost.productions).toEqual([productionId1]);
    const draftId = draftPost.id;

    const listResponse = await server.inject({ method: "GET", url: "/api/v1/blog/post" });
    expect(listResponse.statusCode).toBe(HttpSuccess.OK);
    const posts = listResponse.json<unknown[]>();
    expect(posts.some((p) => BlogPostWithBackwardsRefsSchema.parse(p).id === draftId)).toBe(false);

    await server.inject({
      method: "DELETE",
      url: `/api/v1/blog/post/${draftId}`,
      cookies: { session: sessionCookie },
    });
  });

  test("GET /api/v1/blog/post/:id — returns the created blogpost", async () => {
    const response = await server.inject({ method: "GET", url: `/api/v1/blog/post/${blogPostId}` });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const post = BlogPostWithBackwardsRefsSchema.parse(response.json());
    expect(post).toMatchObject({ id: blogPostId, title: { en: "Test Post" } });
    expect(post.productions).toEqual([productionId1, productionId2]);
  });

  test("GET /api/v1/blog/post/:id/meta — returns the blogpost with metadata", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/blog/post/${blogPostId}/meta`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogPostSchema.withMeta().parse(response.json())).toMatchObject({ id: blogPostId });
  });

  test("PATCH /api/v1/blog/post/:id — updates only the supplied fields", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/blog/post/${blogPostId}`,
      cookies: { session: sessionCookie },
      payload: { 
        title: { en: "Updated Title" },
        productions: [productionId1],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const post = BlogPostWithBackwardsRefsSchema.parse(response.json());
    expect(post.title).toStrictEqual({ en: "Updated Title" });
    expect(post.content).toStrictEqual({ en: "Hello world" }); // unchanged
    expect(post.productions).toEqual([productionId1]);
  });

  test("PUT /api/v1/blog/post/:id — replaces all fields of the blogpost", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/blog/post/${blogPostId}`,
      cookies: { session: sessionCookie },
      payload: {
        blog: blogId,
        title: { en: "Replaced Title" },
        content: { en: "Replaced content" },
        published_at: null,
        productions: [productionId2],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const post = BlogPostWithBackwardsRefsSchema.parse(response.json());
    expect(post).toMatchObject({
      id: blogPostId,
      title: { en: "Replaced Title" },
      published_at: null,
    });
    expect(post.productions).toEqual([productionId2]);
  });

  test("DELETE /api/v1/blog/post/:id — removes the blogpost from the database", async () => {
    const deleteResponse = await server.inject({
      method: "DELETE",
      url: `/api/v1/blog/post/${blogPostId}`,
      cookies: { session: sessionCookie },
    });
    expect(deleteResponse.statusCode).toBe(HttpSuccess.OK);

    const fetchResponse = await server.inject({ method: "GET", url: `/api/v1/blog/post/${blogPostId}` });
    expect(fetchResponse.statusCode).not.toBe(HttpSuccess.OK);
  });

  test("GET /api/v1/production/:id — returns production with linked blogposts", async () => {
    // Create a fresh blogpost to verify the production backwards reference
    const postResponse = await server.inject({
      method: "POST",
      url: "/api/v1/blog/post",
      cookies: { session: sessionCookie },
      payload: {
        blog: blogId,
        title: { en: "Verification Post" },
        content: { en: "Verify backwards refs" },
        published_at: new Date().toISOString(),
        productions: [productionId1],
      },
    });

    expect(postResponse.statusCode).toBe(HttpSuccess.OK);
    const verificationPost = BlogPostWithBackwardsRefsSchema.parse(postResponse.json());
    expect(verificationPost.productions).toEqual([productionId1]);
    const verificationPostId = verificationPost.id;

    // Fetch production and verify it includes the linked blogpost
    const prodResponse = await server.inject({
      method: "GET",
      url: `/api/v1/production/${productionId1}`,
    });

    expect(prodResponse.statusCode).toBe(HttpSuccess.OK);
    const production = ProductionSchemaWithBackwardsRefs.parse(prodResponse.json());
    expect(production.blogposts).toBeDefined();
    expect(Array.isArray(production.blogposts)).toBe(true);
    expect(production.blogposts.some((bp) => {
      const bpId = typeof bp === "object" && bp !== null && "id" in bp ? (bp as { id: number }).id : bp;
      return bpId === verificationPostId;
    })).toBe(true);

    // Clean up verification post
    await server.inject({
      method: "DELETE",
      url: `/api/v1/blog/post/${verificationPostId}`,
      cookies: { session: sessionCookie },
    });
  });
});

describe("Production routes — SQL integration", { sequential: true }, () => {
  let productionId: number;

  const basePayload = {
    title: { nl: "Test Productie" },
    artist: { nl: "Test Artiest" },
    tagline: { nl: "Test tagline" },
    teaser: { nl: "Test teaser" },
    finalized: true,
  };

  test("POST /api/v1/production — inserts and returns a new production", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
      payload: { ...basePayload, old_id: 999, description: { nl: "Een beschrijving" } },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const production = ProductionSchemaWithBackwardsRefs.parse(response.json());
    expect(production).toMatchObject({ title: { nl: "Test Productie" }, tags: [], events: [] });

    productionId = production.id;
  });

  test("GET /api/v1/production — returns a list containing the created production", async () => {
    const response = await server.inject({ method: "GET", url: "/api/v1/production" });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const body = response.json<{ items: unknown[]; total: number }>();
    expect(body.items.some((p) => ProductionSchemaWithBackwardsRefs.parse(p).id === productionId)).toBe(true);
    expect(body.total).toBe(body.items.length);
  });

  test("GET /api/v1/production/:id — returns the created production", async () => {
    const response = await server.inject({ method: "GET", url: `/api/v1/production/${productionId}` });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(ProductionSchemaWithBackwardsRefs.parse(response.json())).toMatchObject({ id: productionId });
  });

  test("GET /api/v1/production/:id/meta — returns the production with metadata", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/production/${productionId}/meta`,
      cookies: { session: sessionCookie },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(ProductionSchema.withMeta().parse(response.json())).toMatchObject({ id: productionId });
  });

  test("PATCH /api/v1/production/:id — updates only the supplied fields", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/production/${productionId}`,
      cookies: { session: sessionCookie },
      payload: { description: { nl: "Aangepaste beschrijving" } },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const production = ProductionSchemaWithBackwardsRefs.parse(response.json());
    expect(production.description).toEqual({ nl: "Aangepaste beschrijving" });
    expect(production.title).toEqual({ nl: "Test Productie" }); // unchanged
  });

  test("PATCH /api/v1/production/bulk — updates multiple productions", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: "/api/v1/production/bulk",
      cookies: { session: sessionCookie },
      payload: {
        ids: [productionId],
        data: { tagline: { nl: "Nieuwe tagline" } },
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const productions = response.json<unknown[]>();
    expect(productions.some((p) => ProductionSchemaWithBackwardsRefs.parse(p).id === productionId)).toBe(true);
  });

  test("PUT /api/v1/production/:id — replaces all fields of the production", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/production/${productionId}`,
      cookies: { session: sessionCookie },
      payload: {
        ...basePayload,
        title: { nl: "Vervangen Productie" },
        old_id: null,
        finalized: false,
        supertitle: null,
        description: null,
        description_extra: null,
        description_2: null,
        video_1: null,
        video_2: null,
        quote: null,
        quote_source: null,
        programme: null,
        info: null,
        tags: [],
      },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(ProductionSchemaWithBackwardsRefs.parse(response.json())).toMatchObject({
      id: productionId,
      title: { nl: "Vervangen Productie" },
      old_id: null,
    });
  });

  test("DELETE /api/v1/production/:id — removes the production from the database", async () => {
    const deleteResponse = await server.inject({
      method: "DELETE",
      url: `/api/v1/production/${productionId}`,
      cookies: { session: sessionCookie },
    });
    expect(deleteResponse.statusCode).toBe(HttpSuccess.OK);

    const fetchResponse = await server.inject({ method: "GET", url: `/api/v1/production/${productionId}` });
    expect(fetchResponse.statusCode).not.toBe(HttpSuccess.OK);
  });

  test("POST /api/v1/production — creates production with empty tags array", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
      payload: { ...basePayload, old_id: 9999, description: { nl: "No tags" }, tags: [] },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const production = ProductionSchemaWithBackwardsRefs.parse(response.json());
    expect(production.tags).toEqual([]);
    expect(production.title).toEqual({ nl: "Test Productie" });
  });

  test("PUT /api/v1/production/:id — can replace production keeping empty tags array", async () => {
    // Create a production to manipulate
    const createResponse = await server.inject({
      method: "POST",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
      payload: { ...basePayload, old_id: 8888, description: { nl: "Edit test" } },
    });
    const tempProductionId = createResponse.json().id;

    // Replace with empty tags array
    const putResponse = await server.inject({
      method: "PUT",
      url: `/api/v1/production/${tempProductionId}`,
      cookies: { session: sessionCookie },
      payload: {
        ...basePayload,
        title: { nl: "Empty Tags Production" },
        old_id: null,
        finalized: false,
        supertitle: null,
        description: null,
        description_extra: null,
        description_2: null,
        video_1: null,
        video_2: null,
        quote: null,
        quote_source: null,
        programme: null,
        info: null,
        tags: [],
      },
    });

    expect(putResponse.statusCode).toBe(HttpSuccess.OK);
    const production = ProductionSchemaWithBackwardsRefs.parse(putResponse.json());
    expect(production.tags).toEqual([]);
    expect(production.title).toEqual({ nl: "Empty Tags Production" });
  });
});

describe("Event & event price routes — SQL integration", () => {
  let hallId: number;
  let productionId: number;

  beforeAll(async () => {
    const hallSeed = await server.inject({
      method: "POST",
      url: "/api/v1/hall",
      cookies: { session: sessionCookie },
      payload: { old_id: null, name: { nl: "Event Test Zaal" }, address: "Teststraat 1" },
    });
    hallId = hallSeed.json().id;

    const productionSeed = await server.inject({
      method: "POST",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
      payload: {
        title: { nl: "Event Test Productie" },
        artist: { nl: "Test Artiest" },
        tagline: { nl: "Test tagline" },
        teaser: { nl: "Test teaser" },
        finalized: false,
      },
    });
    productionId = productionSeed.json().id;
  });

  describe("Event routes — SQL integration", { sequential: true }, () => {
    let eventId: number;

    const baseEventPayload = () => ({
      old_id: null,
      starts_at: "2026-06-01T19:00:00.000Z",
      ends_at: "2026-06-01T21:00:00.000Z",
      doors_at: "2026-06-01T18:30:00.000Z",
      info: { nl: "Test info" },
      production: productionId,
      hall: hallId,
    });

    test("POST /api/v1/event — inserts and returns a new event", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/event",
        cookies: { session: sessionCookie },
        payload: baseEventPayload(),
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const event = EventSchema.parse(response.json());
      expect(event).toMatchObject({ info: { nl: "Test info" }, price: [] });

      eventId = event.id;
    });

    test("GET /api/v1/event — returns a list containing the created event", async () => {
      const response = await server.inject({ method: "GET", url: "/api/v1/event" });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const events = response.json<unknown[]>();
      expect(events.some((e) => EventSchema.parse(e).id === eventId)).toBe(true);
    });

    test("GET /api/v1/event?production=:id — returns only events for that production", async () => {
      // Create another production with its own event
      const otherProdResponse = await server.inject({
        method: "POST",
        url: "/api/v1/production",
        cookies: { session: sessionCookie },
        payload: {
          title: { nl: "Andere Productie" },
          artist: { nl: "Ander Artist" },
          tagline: { nl: "Test tagline" },
          teaser: { nl: "Test teaser" },
          finalized: false,
        },
      });
      const otherProdId = otherProdResponse.json().id;

      // Create an event for the other production
      await server.inject({
        method: "POST",
        url: "/api/v1/event",
        cookies: { session: sessionCookie },
        payload: {
          old_id: null,
          starts_at: "2026-08-01T19:00:00.000Z",
          ends_at: "2026-08-01T21:00:00.000Z",
          doors_at: "2026-08-01T18:30:00.000Z",
          info: { nl: "Ander event" },
          production: otherProdId,
          hall: hallId,
        },
      });

      // Query with production filter
      const response = await server.inject({
        method: "GET",
        url: `/api/v1/event?production=${productionId}`,
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const events = response.json<unknown[]>();
      
      // Should return our event
      expect(events.some((e) => EventSchema.parse(e).id === eventId)).toBe(true);
      
      // Should NOT return the other production's event
      expect(events.every((e) => EventSchema.parse(e).production === productionId)).toBe(true);
    });

    test("GET /api/v1/event?production=:id — returns empty array when no events match", async () => {
      const emptyProdResponse = await server.inject({
        method: "POST",
        url: "/api/v1/production",
        cookies: { session: sessionCookie },
        payload: {
          title: { nl: "Production Zonder Events" },
          artist: { nl: "Test Artist" },
          tagline: { nl: "Test tagline" },
          teaser: { nl: "Test teaser" },
          finalized: false,
        },
      });
      const emptyProdId = emptyProdResponse.json().id;

      const response = await server.inject({
        method: "GET",
        url: `/api/v1/event?production=${emptyProdId}`,
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(response.json<unknown[]>()).toEqual([]);
    });

    test("GET /api/v1/event/:id — returns the created event", async () => {
      const response = await server.inject({ method: "GET", url: `/api/v1/event/${eventId}` });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(EventSchema.parse(response.json())).toMatchObject({ id: eventId });
    });

    test("GET /api/v1/event/:id/meta — returns the event with metadata", async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/v1/event/${eventId}/meta`,
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(EventSchema.withMeta().parse(response.json())).toMatchObject({ id: eventId });
    });

    test("PATCH /api/v1/event/:id — updates only the supplied fields", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/event/${eventId}`,
        cookies: { session: sessionCookie },
        payload: { info: { nl: "Aangepaste info" } },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const event = EventSchema.parse(response.json());
      expect(event.info).toEqual({ nl: "Aangepaste info" });
      expect(event.production).toBe(productionId); // unchanged
    });

    test("PATCH /api/v1/event — bulk updates multiple events", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/event",
        cookies: { session: sessionCookie },
        payload: {
          ids: [eventId],
          data: { info: { nl: "Bulk aangepaste info" } },
        },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const events = response.json<unknown[]>();
      expect(events.some((e) => EventSchema.parse(e).id === eventId)).toBe(true);
    });

    test("PUT /api/v1/event/:id — replaces all fields of the event", async () => {
      const response = await server.inject({
        method: "PUT",
        url: `/api/v1/event/${eventId}`,
        cookies: { session: sessionCookie },
        payload: {
          ...baseEventPayload(),
          info: { nl: "Vervangen info" },
        },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(EventSchema.parse(response.json())).toMatchObject({
        id: eventId,
        info: { nl: "Vervangen info" },
      });
    });

    test("DELETE /api/v1/event/:id — removes the event from the database", async () => {
      const deleteResponse = await server.inject({
        method: "DELETE",
        url: `/api/v1/event/${eventId}`,
        cookies: { session: sessionCookie },
      });
      expect(deleteResponse.statusCode).toBe(HttpSuccess.OK);

      const fetchResponse = await server.inject({ method: "GET", url: `/api/v1/event/${eventId}` });
      expect(fetchResponse.statusCode).not.toBe(HttpSuccess.OK);
    });
  });

  describe("Event price routes — SQL integration", { sequential: true }, () => {
    let eventPriceId: number;
    let eventIdForPrice: number;

    test("POST /api/v1/event — inserts a fresh event to attach prices to", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/event",
        cookies: { session: sessionCookie },
        payload: {
          old_id: null,
          starts_at: "2026-07-01T19:00:00.000Z",
          ends_at: "2026-07-01T21:00:00.000Z",
          doors_at: "2026-07-01T18:30:00.000Z",
          info: { nl: "Prijs test event" },
          production: productionId,
          hall: hallId,
        },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      eventIdForPrice = EventSchema.parse(response.json()).id;
    });

    test("POST /api/v1/event/price — inserts and returns a new event price", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/event/price",
        cookies: { session: sessionCookie },
        payload: { event: eventIdForPrice, amount: 15.5 },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const price = EventPriceSchema.parse(response.json());
      expect(price).toMatchObject({ event: eventIdForPrice, amount: 15.5 });

      eventPriceId = price.id;
    });

    test("GET /api/v1/event/price — returns a list containing the created price", async () => {
      const response = await server.inject({ method: "GET", url: "/api/v1/event/price" });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const prices = response.json<unknown[]>();
      expect(prices.some((p) => EventPriceSchema.parse(p).id === eventPriceId)).toBe(true);
    });

    test("GET /api/v1/event/price/:id — returns the created price", async () => {
      const response = await server.inject({ method: "GET", url: `/api/v1/event/price/${eventPriceId}` });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(EventPriceSchema.parse(response.json())).toMatchObject({ id: eventPriceId, amount: 15.5 });
    });

    test("GET /api/v1/event/price/:id/meta — returns the price with metadata", async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/v1/event/price/${eventPriceId}/meta`,
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(EventPriceSchema.withMeta().parse(response.json())).toMatchObject({ id: eventPriceId });
    });

    test("PATCH /api/v1/event/price/:id — updates only the supplied fields", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/event/price/${eventPriceId}`,
        cookies: { session: sessionCookie },
        payload: { amount: 20 },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const price = EventPriceSchema.parse(response.json());
      expect(price.amount).toBe(20);
      expect(price.event).toBe(eventIdForPrice); // unchanged
    });

    test("PUT /api/v1/event/price/:id — replaces all fields of the price", async () => {
      const response = await server.inject({
        method: "PUT",
        url: `/api/v1/event/price/${eventPriceId}`,
        cookies: { session: sessionCookie },
        payload: { event: eventIdForPrice, amount: 25 },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(EventPriceSchema.parse(response.json())).toMatchObject({
        id: eventPriceId,
        amount: 25,
      });
    });

    test("DELETE /api/v1/event/price/:id — removes the price from the database", async () => {
      const deleteResponse = await server.inject({
        method: "DELETE",
        url: `/api/v1/event/price/${eventPriceId}`,
        cookies: { session: sessionCookie },
      });
      expect(deleteResponse.statusCode).toBe(HttpSuccess.OK);

      const fetchResponse = await server.inject({ method: "GET", url: `/api/v1/event/price/${eventPriceId}` });
      expect(fetchResponse.statusCode).not.toBe(HttpSuccess.OK);
    });
  });
});

describe("Tag & tag type routes — SQL integration", { sequential: true }, () => {
  let tagTypeId: number;

  beforeAll(async () => {
    // Seed a tag type for the tag tests to reference
    const tagTypeSeed = await server.inject({
      method: "POST",
      url: "/api/v1/tag/type",
      cookies: { session: sessionCookie },
      payload: { name: { nl: "Test Type" } },
    });
    tagTypeId = tagTypeSeed.json().id;
  });

  describe("Tag routes — SQL integration", { sequential: true }, () => {
    let tagId: number;

    const baseTagPayload = () => ({
      old_id: null,
      name: { nl: "Test Tag" },
      tag_type: tagTypeId,
      public: true,
    });

    test("POST /api/v1/tag — inserts and returns a new tag", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/tag",
        cookies: { session: sessionCookie },
        payload: baseTagPayload(),
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const tag = TagSchema.parse(response.json());
      expect(tag).toMatchObject({ name: { nl: "Test Tag" }, public: true });

      tagId = tag.id;
    });

    test("GET /api/v1/tag/all — returns a list containing the created tag", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/tag/all",
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const tags = response.json<unknown[]>();
      expect(tags.some((t) => TagSchema.parse(t).id === tagId)).toBe(true);
    });

    test("GET /api/v1/tag — returns public tags containing the created tag", async () => {
      const response = await server.inject({ method: "GET", url: "/api/v1/tag" });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const tags = response.json<unknown[]>();
      expect(tags.some((t) => TagSchema.parse(t).id === tagId)).toBe(true);
    });

    test("GET /api/v1/tag/:id/all — returns the created tag", async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/v1/tag/${tagId}/all`,
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(TagSchema.parse(response.json())).toMatchObject({ id: tagId, name: { nl: "Test Tag" } });
    });

    test("GET /api/v1/tag/:id — returns the public tag", async () => {
      const response = await server.inject({ method: "GET", url: `/api/v1/tag/${tagId}` });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(TagSchema.parse(response.json())).toMatchObject({ id: tagId });
    });

    test("GET /api/v1/tag/:id/meta — returns the tag with metadata", async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/v1/tag/${tagId}/meta`,
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(TagSchema.withMeta().parse(response.json())).toMatchObject({ id: tagId });
    });

    test("PATCH /api/v1/tag/:id — updates only the supplied fields", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/tag/${tagId}`,
        cookies: { session: sessionCookie },
        payload: { name: { nl: "Aangepaste Tag" } },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const tag = TagSchema.parse(response.json());
      expect(tag.name).toEqual({ nl: "Aangepaste Tag" });
      expect(tag.public).toBe(true); // unchanged
    });

    test("PUT /api/v1/tag/:id — replaces all fields of the tag", async () => {
      const response = await server.inject({
        method: "PUT",
        url: `/api/v1/tag/${tagId}`,
        cookies: { session: sessionCookie },
        payload: { ...baseTagPayload(), name: { nl: "Vervangen Tag" }, public: false },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(TagSchema.parse(response.json())).toMatchObject({
        id: tagId,
        name: { nl: "Vervangen Tag" },
        public: false,
      });
    });

    test("DELETE /api/v1/tag/:id — removes the tag from the database", async () => {
      const deleteResponse = await server.inject({
        method: "DELETE",
        url: `/api/v1/tag/${tagId}`,
        cookies: { session: sessionCookie },
      });
      expect(deleteResponse.statusCode).toBe(HttpSuccess.OK);

      const fetchResponse = await server.inject({ method: "GET", url: `/api/v1/tag/${tagId}` });
      expect(fetchResponse.statusCode).not.toBe(HttpSuccess.OK);
    });

    test("POST /api/v1/tag — creates a tag without production links (empty array)", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/tag",
        cookies: { session: sessionCookie },
        payload: {
          old_id: null,
          name: { nl: "Unlinked Tag" },
          tag_type: tagTypeId,
          public: true,
        },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const tag = TagSchema.parse(response.json());
      expect(tag).toMatchObject({ name: { nl: "Unlinked Tag" }, public: true });
      
      // Verify when fetched it still has empty production links
      const fetchResponse = await server.inject({
        method: "GET",
        url: `/api/v1/tag/${tag.id}`,
      });
      expect(fetchResponse.statusCode).toBe(HttpSuccess.OK);
      const fetchedTag = TagSchema.parse(fetchResponse.json());
      expect(fetchedTag).toMatchObject({ id: tag.id, name: { nl: "Unlinked Tag" } });
    });
  });

  describe("Tag type routes — SQL integration", { sequential: true }, () => {
    let tagTypeIdLocal: number;

    test("POST /api/v1/tag/type — inserts and returns a new tag type", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/tag/type",
        cookies: { session: sessionCookie },
        payload: { name: { nl: "Categorie" } },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const tagType = TagTypeSchema.parse(response.json());
      expect(tagType).toMatchObject({ name: { nl: "Categorie" } });

      tagTypeIdLocal = tagType.id;
    });

    test("GET /api/v1/tag/type — returns a list containing the created tag type", async () => {
      const response = await server.inject({ method: "GET", url: "/api/v1/tag/type" });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const tagTypes = response.json<unknown[]>();
      expect(tagTypes.some((t) => TagTypeSchema.parse(t).id === tagTypeIdLocal)).toBe(true);
    });

    test("GET /api/v1/tag/type/:id — returns the created tag type", async () => {
      const response = await server.inject({ method: "GET", url: `/api/v1/tag/type/${tagTypeIdLocal}` });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(TagTypeSchema.parse(response.json())).toMatchObject({ id: tagTypeIdLocal, name: { nl: "Categorie" } });
    });

    test("GET /api/v1/tag/type/:id/meta — returns the tag type with metadata", async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/v1/tag/type/${tagTypeIdLocal}/meta`,
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(TagTypeSchema.withMeta().parse(response.json())).toMatchObject({ id: tagTypeIdLocal });
    });

    test("PATCH /api/v1/tag/type/:id — updates only the supplied fields", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/tag/type/${tagTypeIdLocal}`,
        cookies: { session: sessionCookie },
        payload: { name: { nl: "Aangepaste Categorie" } },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(TagTypeSchema.parse(response.json())).toMatchObject({ name: { nl: "Aangepaste Categorie" } });
    });

    test("PUT /api/v1/tag/type/:id — replaces all fields of the tag type", async () => {
      const response = await server.inject({
        method: "PUT",
        url: `/api/v1/tag/type/${tagTypeIdLocal}`,
        cookies: { session: sessionCookie },
        payload: { name: { nl: "Vervangen Categorie", fr: "Catégorie Remplacée" } },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(TagTypeSchema.parse(response.json())).toMatchObject({
        id: tagTypeIdLocal,
        name: { nl: "Vervangen Categorie", fr: "Catégorie Remplacée" },
      });
    });

    test("DELETE /api/v1/tag/type/:id — removes the tag type from the database", async () => {
      const deleteResponse = await server.inject({
        method: "DELETE",
        url: `/api/v1/tag/type/${tagTypeIdLocal}`,
        cookies: { session: sessionCookie },
      });
      expect(deleteResponse.statusCode).toBe(HttpSuccess.OK);

      const fetchResponse = await server.inject({ method: "GET", url: `/api/v1/tag/type/${tagTypeIdLocal}` });
      expect(fetchResponse.statusCode).not.toBe(HttpSuccess.OK);
    });
  });
});

describe("Media (image & crop) routes — SQL integration", { sequential: true }, () => {
  let productionId: number;

  beforeAll(async () => {
    // No real S3 bucket in this test suite — replace with a no-op mock
    server.s3.client = {
      send: vi.fn().mockResolvedValue({}),
      destroy: vi.fn(),
    } as unknown as import("@aws-sdk/client-s3").S3Client;

    const prodRes = await server.inject({
      method: "POST",
      url: "/api/v1/production",
      cookies: { session: sessionCookie },
      payload: {
        title: { nl: "Media Test Productie" },
        artist: { nl: "Test Artiest" },
        tagline: { nl: "Tagline" },
        teaser: { nl: "Teaser" },
        finalized: false,
      },
    });
    expect(prodRes.statusCode).toBe(HttpSuccess.OK);
    productionId = prodRes.json().id;
  });

  describe("Image routes — SQL integration", { sequential: true }, () => {
    let imageId: number;
    let imageIdWithCrops: number;

    test("POST /api/v1/production/:productionId/image — creates an image (JSON, no crops)", async () => {
      const response = await server.inject({
        method: "POST",
        url: `/api/v1/production/${productionId}/image`,
        cookies: { session: sessionCookie },
        payload: { res: "1920x1080", old_id: null },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const json = response.json();
      expect(json).toMatchObject({
        production: productionId,
        res: "1920x1080",
        old_id: null,
      });
      expect(json.crops).toEqual([]);
      imageId = json.id;
    });

    test("POST /api/v1/production/:productionId/image — creates an image with crops (multipart)", async () => {
      const form = new FormData();
      form.append(
        "data",
        JSON.stringify({
          res: "3840x2160",
          old_id: null,
          crops: [{ filename: "hero.jpg", type: "hero" }],
        }),
      );
      form.append("file", new Blob(["fake-img"], { type: "image/jpeg" }), "hero.jpg");

      const response = await server.inject({
        method: "POST",
        url: `/api/v1/production/${productionId}/image`,
        cookies: { session: sessionCookie },
        payload: form,
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const json = response.json();
      expect(json).toMatchObject({ production: productionId, res: "3840x2160" });
      expect(json.crops).toHaveLength(1);
      expect(json.crops[0]).toMatchObject({ type: "hero" });
      imageIdWithCrops = json.id;
    });

    test("POST /api/v1/production/:productionId/image — rejects multipart with missing file for crop mapping", async () => {
      const form = new FormData();
      form.append(
        "data",
        JSON.stringify({
          res: "1920x1080",
          crops: [{ filename: "nonexistent.jpg", type: "general" }],
        }),
      );

      const response = await server.inject({
        method: "POST",
        url: `/api/v1/production/${productionId}/image`,
        cookies: { session: sessionCookie },
        payload: form,
      });

      expect(response.statusCode).toBe(400);
    });

    test("POST /api/v1/production/:productionId/image — requires auth", async () => {
      const response = await server.inject({
        method: "POST",
        url: `/api/v1/production/${productionId}/image`,
        payload: { res: "1920x1080" },
      });

      expect(response.statusCode).toBe(401);
    });

    test("GET /api/v1/production/:productionId/image — lists images for the production", async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/v1/production/${productionId}/image`,
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const images = response.json<{ id: number }[]>();
      expect(images.length).toBeGreaterThanOrEqual(2);
      expect(images.some((i) => i.id === imageId)).toBe(true);
      expect(images.some((i) => i.id === imageIdWithCrops)).toBe(true);
    });

    test("GET /api/v1/production/:productionId/image — returns empty array for production with no images", async () => {
      const prodRes = await server.inject({
        method: "POST",
        url: "/api/v1/production",
        cookies: { session: sessionCookie },
        payload: {
          title: { nl: "Lege Productie" },
          artist: { nl: "Artiest" },
          tagline: { nl: "Tag" },
          teaser: { nl: "Tease" },
          finalized: false,
        },
      });
      const emptyProdId = prodRes.json().id;

      const response = await server.inject({
        method: "GET",
        url: `/api/v1/production/${emptyProdId}/image`,
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(response.json()).toEqual([]);
    });

    test("GET /api/v1/image/:id — returns the image with its crops", async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/v1/image/${imageIdWithCrops}`,
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const json = response.json();
      expect(json).toMatchObject({ id: imageIdWithCrops, production: productionId });
      expect(json.crops).toHaveLength(1);
    });

    test("GET /api/v1/image/:id — returns 404 for non-existent image", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/image/999999",
      });

      expect(response.statusCode).not.toBe(HttpSuccess.OK);
    });

    test("GET /api/v1/image/:id/meta — returns image with metadata", async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/v1/image/${imageId}/meta`,
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const json = response.json();
      expect(json).toMatchObject({ id: imageId });
      expect(json.created_at).toBeDefined();
      expect(json.updated_at).toBeDefined();
      expect(json.created_by).toBeDefined();
      expect(json.updated_by).toBeDefined();
    });

    test("PATCH /api/v1/image/:id — updates only the supplied fields", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/image/${imageId}`,
        cookies: { session: sessionCookie },
        payload: { res: "2560x1440" },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const json = response.json();
      expect(json).toMatchObject({ id: imageId, res: "2560x1440" });
      expect(json.old_id).toBeNull(); // unchanged
    });

    test("PATCH /api/v1/image/:id — rejects empty body", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/image/${imageId}`,
        cookies: { session: sessionCookie },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    test("PATCH /api/v1/image/:id — returns 404 for non-existent image", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/image/999999",
        cookies: { session: sessionCookie },
        payload: { res: "640x480" },
      });

      expect(response.statusCode).toBe(404);
    });

    test("PATCH /api/v1/image/:id — requires auth", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/image/${imageId}`,
        payload: { res: "640x480" },
      });

      expect(response.statusCode).toBe(401);
    });

    test("PUT /api/v1/image/:id — replaces image fields (JSON, no crops)", async () => {
      const response = await server.inject({
        method: "PUT",
        url: `/api/v1/image/${imageId}`,
        cookies: { session: sessionCookie },
        payload: { res: "4096x2160", old_id: 42 },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const json = response.json();
      expect(json).toMatchObject({ id: imageId, res: "4096x2160", old_id: 42 });
    });

    test("PUT /api/v1/image/:id — replaces image with new crops (multipart)", async () => {
      const form = new FormData();
      form.append(
        "data",
        JSON.stringify({
          res: "7680x4320",
          old_id: null,
          crops: [{ filename: "thumb.png", type: "thumbnail" }],
        }),
      );
      form.append("file", new Blob(["thumb-data"], { type: "image/png" }), "thumb.png");

      const response = await server.inject({
        method: "PUT",
        url: `/api/v1/image/${imageIdWithCrops}`,
        cookies: { session: sessionCookie },
        payload: form,
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const json = response.json();
      expect(json).toMatchObject({ id: imageIdWithCrops, res: "7680x4320" });
      expect(json.crops).toHaveLength(1);
      expect(json.crops[0]).toMatchObject({ type: "thumbnail" });
    });

    test("PUT /api/v1/image/:id — rejects multipart when crop mapping references missing file", async () => {
      const form = new FormData();
      form.append(
        "data",
        JSON.stringify({
          res: "1920x1080",
          old_id: null,
          crops: [{ filename: "ghost.jpg", type: "general" }],
        }),
      );

      const response = await server.inject({
        method: "PUT",
        url: `/api/v1/image/${imageIdWithCrops}`,
        cookies: { session: sessionCookie },
        payload: form,
      });

      expect(response.statusCode).toBe(400);
    });

    test("PUT /api/v1/image/:id — returns 404 for non-existent image", async () => {
      const response = await server.inject({
        method: "PUT",
        url: "/api/v1/image/999999",
        cookies: { session: sessionCookie },
        payload: { res: "1920x1080", old_id: null },
      });

      expect(response.statusCode).toBe(404);
    });

    test("PUT /api/v1/image/:id — requires auth", async () => {
      const response = await server.inject({
        method: "PUT",
        url: `/api/v1/image/${imageId}`,
        payload: { res: "1920x1080", old_id: null },
      });

      expect(response.statusCode).toBe(401);
    });

    test("DELETE /api/v1/image/:id — removes the image and its crops", async () => {
      const delRes = await server.inject({
        method: "DELETE",
        url: `/api/v1/image/${imageIdWithCrops}`,
        cookies: { session: sessionCookie },
      });
      expect(delRes.statusCode).toBe(HttpSuccess.OK);

      const fetchRes = await server.inject({
        method: "GET",
        url: `/api/v1/image/${imageIdWithCrops}`,
      });
      expect(fetchRes.statusCode).not.toBe(HttpSuccess.OK);
    });

    test("DELETE /api/v1/image/:id — returns 404 for non-existent image", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: "/api/v1/image/999999",
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(404);
    });

    test("DELETE /api/v1/image/:id — requires auth", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: `/api/v1/image/${imageId}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("Crop routes — SQL integration", { sequential: true }, () => {
    let imageId: number;
    let cropId: number;

    beforeAll(async () => {
      // Seed an image for crop tests
      const res = await server.inject({
        method: "POST",
        url: `/api/v1/production/${productionId}/image`,
        cookies: { session: sessionCookie },
        payload: { res: "1920x1080" },
      });
      expect(res.statusCode).toBe(HttpSuccess.OK);
      imageId = res.json().id;
    });

    test("POST /api/v1/image/:imageId/crop — uploads crops to an existing image", async () => {
      const form = new FormData();
      form.append(
        "data",
        JSON.stringify({
          crops: [{ filename: "banner.jpg", type: "banner" }],
        }),
      );
      form.append("file", new Blob(["banner-data"], { type: "image/jpeg" }), "banner.jpg");

      const response = await server.inject({
        method: "POST",
        url: `/api/v1/image/${imageId}/crop`,
        cookies: { session: sessionCookie },
        payload: form,
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const crops = response.json<{ id: number; type: string }[]>();
      expect(crops).toHaveLength(1);
      expect(crops[0]!.type).toBe("banner");
      cropId = crops[0]!.id;
    });

    test("POST /api/v1/image/:imageId/crop — rejects non-multipart request", async () => {
      const response = await server.inject({
        method: "POST",
        url: `/api/v1/image/${imageId}/crop`,
        cookies: { session: sessionCookie },
        payload: { crops: [{ filename: "x.jpg", type: "general" }] },
      });

      expect(response.statusCode).toBe(400);
    });

    test("POST /api/v1/image/:imageId/crop — rejects when file is missing for mapping", async () => {
      const form = new FormData();
      form.append(
        "data",
        JSON.stringify({
          crops: [{ filename: "missing.jpg", type: "general" }],
        }),
      );

      const response = await server.inject({
        method: "POST",
        url: `/api/v1/image/${imageId}/crop`,
        cookies: { session: sessionCookie },
        payload: form,
      });

      expect(response.statusCode).toBe(400);
    });

    test("POST /api/v1/image/:imageId/crop — returns 404 for non-existent image", async () => {
      const form = new FormData();
      form.append(
        "data",
        JSON.stringify({
          crops: [{ filename: "x.jpg", type: "general" }],
        }),
      );
      form.append("file", new Blob(["data"], { type: "image/jpeg" }), "x.jpg");

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/image/999999/crop",
        cookies: { session: sessionCookie },
        payload: form,
      });

      expect(response.statusCode).toBe(404);
    });

    test("POST /api/v1/image/:imageId/crop — requires auth", async () => {
      const form = new FormData();
      form.append("data", JSON.stringify({ crops: [{ filename: "x.jpg", type: "general" }] }));
      form.append("file", new Blob(["data"], { type: "image/jpeg" }), "x.jpg");

      const response = await server.inject({
        method: "POST",
        url: `/api/v1/image/${imageId}/crop`,
        payload: form,
      });

      expect(response.statusCode).toBe(401);
    });

    test("GET /api/v1/image/:imageId/crop — lists crops for the image", async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/v1/image/${imageId}/crop`,
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      const crops = response.json<{ id: number }[]>();
      expect(crops.some((c) => c.id === cropId)).toBe(true);
    });

    test("GET /api/v1/image/:imageId/crop/:type — returns crop by type", async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/v1/image/${imageId}/crop/banner`,
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(response.json()).toMatchObject({ id: cropId, type: "banner" });
    });

    test("GET /api/v1/image/:imageId/crop/:type — returns 404 for unknown type", async () => {
      const response = await server.inject({
        method: "GET",
        url: `/api/v1/image/${imageId}/crop/nonexistent`,
      });

      expect(response.statusCode).not.toBe(HttpSuccess.OK);
    });

    test("PATCH /api/v1/crop/:id — updates crop type (JSON)", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/crop/${cropId}`,
        cookies: { session: sessionCookie },
        payload: { type: "hero" },
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(response.json()).toMatchObject({ id: cropId, type: "hero" });
    });

    test("PATCH /api/v1/crop/:id — updates type and replaces file (multipart)", async () => {
      const form = new FormData();
      form.append("data", JSON.stringify({ type: "updated" }));
      form.append("file", new Blob(["new-data"], { type: "image/png" }), "new.png");

      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/crop/${cropId}`,
        cookies: { session: sessionCookie },
        payload: form,
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(response.json()).toMatchObject({ id: cropId, type: "updated" });
    });

    test("PATCH /api/v1/crop/:id — replaces file only via multipart (no type change)", async () => {
      const form = new FormData();
      form.append("data", JSON.stringify({}));
      form.append("file", new Blob(["file-only"], { type: "image/jpeg" }), "file.jpg");

      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/crop/${cropId}`,
        cookies: { session: sessionCookie },
        payload: form,
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(response.json()).toMatchObject({ id: cropId });
    });

    test("PATCH /api/v1/crop/:id — multipart with type only (no file)", async () => {
      const form = new FormData();
      form.append("data", JSON.stringify({ type: "type_only" }));

      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/crop/${cropId}`,
        cookies: { session: sessionCookie },
        payload: form,
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(response.json()).toMatchObject({ id: cropId, type: "type_only" });
    });

    test("PATCH /api/v1/crop/:id — rejects empty body (no type, no file)", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/crop/${cropId}`,
        cookies: { session: sessionCookie },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    test("PATCH /api/v1/crop/:id — multipart with no type and no file returns 400", async () => {
      const form = new FormData();
      form.append("data", JSON.stringify({}));

      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/crop/${cropId}`,
        cookies: { session: sessionCookie },
        payload: form,
      });

      expect(response.statusCode).toBe(400);
    });

    test("PATCH /api/v1/crop/:id — returns 404 for non-existent crop", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/crop/999999",
        cookies: { session: sessionCookie },
        payload: { type: "nope" },
      });

      expect(response.statusCode).toBe(404);
    });

    test("PATCH /api/v1/crop/:id — requires auth", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: `/api/v1/crop/${cropId}`,
        payload: { type: "nope" },
      });

      expect(response.statusCode).toBe(401);
    });

    test("PUT /api/v1/crop/:id — replaces crop entirely (multipart)", async () => {
      const form = new FormData();
      form.append("data", JSON.stringify({ type: "replaced" }));
      form.append("file", new Blob(["replaced-data"], { type: "image/jpeg" }), "replaced.jpg");

      const response = await server.inject({
        method: "PUT",
        url: `/api/v1/crop/${cropId}`,
        cookies: { session: sessionCookie },
        payload: form,
      });

      expect(response.statusCode).toBe(HttpSuccess.OK);
      expect(response.json()).toMatchObject({ id: cropId, type: "replaced" });
    });

    test("PUT /api/v1/crop/:id — rejects non-multipart request", async () => {
      const response = await server.inject({
        method: "PUT",
        url: `/api/v1/crop/${cropId}`,
        cookies: { session: sessionCookie },
        payload: { type: "nope" },
      });

      expect(response.statusCode).toBe(400);
    });

    test("PUT /api/v1/crop/:id — rejects multipart without file", async () => {
      const form = new FormData();
      form.append("data", JSON.stringify({ type: "nope" }));

      const response = await server.inject({
        method: "PUT",
        url: `/api/v1/crop/${cropId}`,
        cookies: { session: sessionCookie },
        payload: form,
      });

      expect(response.statusCode).toBe(400);
    });

    test("PUT /api/v1/crop/:id — returns 404 for non-existent crop", async () => {
      const form = new FormData();
      form.append("data", JSON.stringify({ type: "nope" }));
      form.append("file", new Blob(["data"], { type: "image/jpeg" }), "x.jpg");

      const response = await server.inject({
        method: "PUT",
        url: "/api/v1/crop/999999",
        cookies: { session: sessionCookie },
        payload: form,
      });

      expect(response.statusCode).toBe(404);
    });

    test("PUT /api/v1/crop/:id — requires auth", async () => {
      const form = new FormData();
      form.append("data", JSON.stringify({ type: "nope" }));
      form.append("file", new Blob(["data"], { type: "image/jpeg" }), "x.jpg");

      const response = await server.inject({
        method: "PUT",
        url: `/api/v1/crop/${cropId}`,
        payload: form,
      });

      expect(response.statusCode).toBe(401);
    });

    test("DELETE /api/v1/crop/:id — removes the crop from the database", async () => {
      const delRes = await server.inject({
        method: "DELETE",
        url: `/api/v1/crop/${cropId}`,
        cookies: { session: sessionCookie },
      });
      expect(delRes.statusCode).toBe(HttpSuccess.OK);
      expect(delRes.json()).toMatchObject({ id: cropId });

      // Verify it's gone
      const listRes = await server.inject({
        method: "GET",
        url: `/api/v1/image/${imageId}/crop`,
      });
      expect(listRes.statusCode).toBe(HttpSuccess.OK);
      expect(listRes.json<{ id: number }[]>().some((c) => c.id === cropId)).toBe(false);
    });

    test("DELETE /api/v1/crop/:id — returns 404 for non-existent crop", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: "/api/v1/crop/999999",
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(404);
    });

    test("DELETE /api/v1/crop/:id — requires auth", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: `/api/v1/crop/${cropId}`,
      });

      expect(response.statusCode).toBe(401);
    });
  });
});