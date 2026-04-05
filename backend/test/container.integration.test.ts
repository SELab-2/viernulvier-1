import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "@/server.js";
import type { FastifyInstance } from "fastify";
import { HallSchema } from "@viernulvier/shared/index.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { migrate } from "@/db/migrate.js";
import { hashPassword } from "@/routes/auth/handlers/hash.js";

let server: FastifyInstance;
let sessionCookie: string;
let container: StartedPostgreSqlContainer;
let hallId: number;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  process.env["DATABASE_URL"] = container.getConnectionUri();
  process.env["JWT_SECRET"] ??= "test-secret";

  await migrate();

  server = await buildServer();

  // Seed a superadmin
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

  // Log in to get a real session cookie
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

describe("Hall routes — SQL integration", { sequential: true }, () => {
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

  test("GET /api/v1/hall — returns a list containing the seeded hall", async () => {
    const response = await server.inject({ method: "GET", url: "/api/v1/hall" });

    expect(response.statusCode).toBe(HttpSuccess.OK);
    const halls = response.json<unknown[]>();
    expect(halls.some((h) => HallSchema.parse(h).id === hallId)).toBe(true);
  });

  test("GET /api/v1/hall/:id — returns the seeded hall", async () => {
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