import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { HallSchema, AdminSchema, BlogSchema, ProductionSchema, ProductionSchemaWithBackwardsRefs, EventSchema, EventPriceSchema, TagSchema, TagTypeSchema } from "@viernulvier/shared/index.js";
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
      payload: { name: "Test Blog", description: "A test description" },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const blog = BlogSchema.parse(response.json());
    expect(blog).toMatchObject({ name: "Test Blog", description: "A test description" });

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
    expect(BlogSchema.parse(response.json())).toMatchObject({ id: blogId, name: "Test Blog" });
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
      payload: { description: "Updated description" },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const blog = BlogSchema.parse(response.json());
    expect(blog.description).toBe("Updated description");
    expect(blog.name).toBe("Test Blog"); // unchanged
  });

  test("PUT /api/v1/blog/:id — replaces all fields of the blog", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/blog/${blogId}`,
      cookies: { session: sessionCookie },
      payload: { name: "Replaced Blog", description: null },
    });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    expect(BlogSchema.parse(response.json())).toMatchObject({
      id: blogId,
      name: "Replaced Blog",
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
    const productions = response.json<unknown[]>();
    expect(productions.some((p) => ProductionSchemaWithBackwardsRefs.parse(p).id === productionId)).toBe(true);
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