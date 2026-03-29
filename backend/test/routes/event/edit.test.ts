import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildServer } from "@/server.js";

let server: FastifyInstance;
let storedEvents: Array<{ id: number; [key: string]: unknown }>;
let sessionCookie: string;

const baseEvent = {
  id: 1,
  old_id: 111,
  starts_at: new Date("2026-01-01T18:00:00.000Z"),
  ends_at: new Date("2026-01-01T20:00:00.000Z"),
  production: 10,
  hall: 3,
  doors_at: new Date("2026-01-01T17:30:00.000Z"),
  info: { nl: "Info mock 1" },
  created_by: 1,
  created_at: new Date("2026-01-01T10:00:00.000Z"),
  updated_by: null,
  updated_at: null,
};

const initialEvents = [
  baseEvent,
  { ...baseEvent, id: 2, old_id: 112, production: 11, hall: 4, info: { nl: "Info mock 2" } },
  { ...baseEvent, id: 3, old_id: 113, production: 12, hall: 5, info: { nl: "Info mock 3" } },
];

beforeAll(async () => {
  server = await buildServer();
  sessionCookie = server.jwt.sign({ id: 1, username: "TestAdmin" });

  server.pg.query = vi.fn().mockImplementation((query: string, params?: unknown[]) => {
    if (query.includes("UPDATE events")) {
      const id = Number(params?.[9]);
      const index = storedEvents.findIndex((event) => Number(event.id) === id);
      if (index === -1) return Promise.resolve({ rows: [] });

      // eslint-disable-next-line security/detect-object-injection
      const current = storedEvents[index]!;
      const updated = {
        ...current,
        old_id: (params?.[0] as number | undefined) ?? current["old_id"],
        starts_at: (params?.[1] as Date | undefined) ?? current["starts_at"],
        ends_at: (params?.[2] as Date | undefined) ?? current["ends_at"],
        production: (params?.[3] as number | undefined) ?? current["production"],
        hall: (params?.[4] as number | undefined) ?? current["hall"],
        doors_at: (params?.[5] as Date | undefined) ?? current["doors_at"],
        info: params?.[6] ?? current["info"],
        updated_at: params?.[7] ? new Date(params?.[7] as string) : new Date(),
        updated_by: params?.[8],
      };

      // eslint-disable-next-line security/detect-object-injection
      storedEvents[index] = updated;
      const event = { ...updated, price: [] };
      return Promise.resolve({ rows: [event] });
    }

    if (query.includes("FROM event WHERE id = $1")) {
      const id = Number(params?.[0]);
      if (id > storedEvents.length) return Promise.resolve({ rows: [] });
      const event = { ...storedEvents.find((row) => Number(row.id) === id), price: [] };
      return Promise.resolve({ rows: event ? [event] : [] });
    }

    if (query.includes("FROM event") && !query.includes("WHERE id = $1")) {
      const events = storedEvents.map((row) => ({ ...row, price: [] }));
      return Promise.resolve({ rows: events });
    }

    return Promise.resolve({ rows: [] });
  });
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  storedEvents = structuredClone(initialEvents);
});

describe("Event Edit Routes", () => {
  describe("error handling", () => {
    test("returns 500 when database query fails", async () => {
      const originalMock = server.pg.query;
      server.pg.query = vi.fn().mockRejectedValue(new Error("Database error"));

      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/event/1",
        payload: { production: 20 },
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(500);
      server.pg.query = originalMock;
    });

    test("returns 400 when request payload is invalid", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/event/1",
        payload: {
          production: "not a number",
        },
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "Invalid request data" });
    });

    test("returns 404 when event not in database", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/event/999",
        payload: { production: 20 },
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "Not Found" });
    });

    test("returns 400 when ID is invalid", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/event/invalid",
        payload: { production: 20 },
        cookies: { session: sessionCookie },
      });

      expect(response.statusCode).toBe(400);
    });

    test("requires authentication", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/event/1",
        payload: { production: 20 },
      });

      expect(response.statusCode).toBe(401);
    });

    test("returns 404 when no rows are returned from database", async () => {
      const originalMock = server.pg.query;
      server.pg.query = vi.fn().mockResolvedValue({ rows: [] });
      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/event/1",
        payload: { production: 20 },
        cookies: { session: sessionCookie },
      });
      expect(response.statusCode).toBe(404);
      server.pg.query = originalMock;
    });
  });

  describe("partial updates", () => {
    test("updates single field on one event", async () => {
      const editResponse = await server.inject({
        method: "PATCH",
        url: "/api/v1/event/2",
        payload: { production: 99 },
        cookies: { session: sessionCookie },
      });

      expect(editResponse.statusCode).toBe(200);
      const body = editResponse.json();
      expect(body.id).toBe(2);
      expect(body.old_id).toBe(initialEvents[1]!.old_id);
      expect(body.production).toBe(99);
      expect(body.starts_at).toBe(initialEvents[1]!.starts_at.toISOString());
      expect(body.ends_at).toBe(initialEvents[1]!.ends_at.toISOString());
      expect(body.doors_at).toBe(initialEvents[1]!.doors_at.toISOString());
      expect(body.hall).toBe(initialEvents[1]!.hall);
      expect(body.info).toEqual(initialEvents[1]!.info);
      expect(body.price).toEqual([]);

      const listResponse = await server.inject({
        method: "GET",
        url: "/api/v1/event",
        cookies: { session: sessionCookie },
      });

      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json()).toHaveLength(3);
      const listedEvent = listResponse.json()[1];
      expect(listedEvent.id).toBe(2);
      expect(listedEvent.old_id).toBe(112);
      expect(listedEvent.production).toBe(99);
      expect(listedEvent.starts_at).toBe(initialEvents[1]!.starts_at.toISOString());
      expect(listedEvent.ends_at).toBe(initialEvents[1]!.ends_at.toISOString());
      expect(listedEvent.doors_at).toBe(initialEvents[1]!.doors_at.toISOString());
      expect(listedEvent.hall).toBe(initialEvents[1]!.hall);
      expect(listedEvent.info).toEqual(initialEvents[1]!.info);
      expect(listedEvent.price).toEqual([]);
    });

    test("updates multiple fields on one event", async () => {
      const newStartsAt = new Date("2026-02-01T18:00:00.000Z");
      const newEndsAt = new Date("2026-02-01T21:00:00.000Z");

      const editResponse = await server.inject({
        method: "PATCH",
        url: "/api/v1/event/2",
        payload: {
          starts_at: newStartsAt,
          ends_at: newEndsAt,
          hall: 9,
        },
        cookies: { session: sessionCookie },
      });

      expect(editResponse.statusCode).toBe(200);
      const editBody = editResponse.json();
      expect(editBody.id).toBe(2);
      expect(editBody.old_id).toBe(112);
      expect(editBody.starts_at).toBe(newStartsAt.toISOString());
      expect(editBody.ends_at).toBe(newEndsAt.toISOString());
      expect(editBody.hall).toBe(9);
      expect(editBody.doors_at).toBe(initialEvents[1]!.doors_at.toISOString());
      expect(editBody.production).toBe(initialEvents[1]!.production);
      expect(editBody.info).toEqual(initialEvents[1]!.info);
      expect(editBody.price).toEqual([]);

      const listResponse = await server.inject({
        method: "GET",
        url: "/api/v1/event",
        cookies: { session: sessionCookie },
      });

      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json()).toHaveLength(3);
      const listedEvent2 = listResponse.json()[1];
      expect(listedEvent2.id).toBe(2);
      expect(listedEvent2.old_id).toBe(112);
      expect(listedEvent2.starts_at).toBe(newStartsAt.toISOString());
      expect(listedEvent2.ends_at).toBe(newEndsAt.toISOString());
      expect(listedEvent2.hall).toBe(9);
      expect(listedEvent2.doors_at).toBe(initialEvents[1]!.doors_at.toISOString());
    });

    test("edits one event and keeps the others unchanged", async () => {
      const editResponse = await server.inject({
        method: "PATCH",
        url: "/api/v1/event/1",
        payload: { production: 555 },
        cookies: { session: sessionCookie },
      });

      expect(editResponse.statusCode).toBe(200);
      const editBody = editResponse.json();
      expect(editBody.id).toBe(1);
      expect(editBody.production).toBe(555);
      expect(editBody.starts_at).toBe(initialEvents[0]!.starts_at.toISOString());
      expect(editBody.ends_at).toBe(initialEvents[0]!.ends_at.toISOString());
      expect(editBody.doors_at).toBe(initialEvents[0]!.doors_at.toISOString());
      expect(editBody.hall).toBe(initialEvents[0]!.hall);
      expect(editBody.info).toEqual(initialEvents[0]!.info);
      expect(editBody.price).toEqual([]);

      const listResponse = await server.inject({
        method: "GET",
        url: "/api/v1/event",
        cookies: { session: sessionCookie },
      });

      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json()).toHaveLength(3);
      const events = listResponse.json();
      
      // Event 1 should be updated
      expect(events[0]!.id).toBe(1);
      expect(events[0]!.production).toBe(555);
      expect(events[0]!.starts_at).toBe(initialEvents[0]!.starts_at.toISOString());
      expect(events[0]!.ends_at).toBe(initialEvents[0]!.ends_at.toISOString());
      // Events 2 and 3 should be unchanged
      expect(events[1]!.id).toBe(2);
      expect(events[1]!.production).toBe(initialEvents[1]!.production);
      expect(events[2]!.id).toBe(3);
      expect(events[2]!.production).toBe(initialEvents[2]!.production);
    });
  });

  describe("metadata updates", () => {
    test("updates updated_at and updated_by when editing event", async () => {
      const editResponse = await server.inject({
        method: "PATCH",
        url: "/api/v1/event/1",
        payload: { production: 20 },
        cookies: { session: sessionCookie },
      });

      expect(editResponse.statusCode).toBe(200);
      const event = editResponse.json();
      expect(event.production).toBe(20);

      // Verify metadata was updated in stored events
      const editedEvent = storedEvents.find((e) => Number(e["id"]) === 1);
      expect(editedEvent!["updated_by"]).toBe(1);
      expect(editedEvent!["updated_at"]).toBeDefined();
      expect(editedEvent!["updated_at"]).not.toEqual(baseEvent.updated_at);
    });

    test("does not update other events' metadata", async () => {
      const editResponse = await server.inject({
        method: "PATCH",
        url: "/api/v1/event/2",
        payload: { hall: 7 },
        cookies: { session: sessionCookie },
      });

      expect(editResponse.statusCode).toBe(200);

      // Event 2 should be updated
      const editedEvent = storedEvents.find((e) => Number(e["id"]) === 2);
      expect(editedEvent!["updated_by"]).toBe(1);
      expect(editedEvent!["updated_at"]).toBeDefined();

      // Event 3 should not be changed
      const unchangedEvent = storedEvents.find((e) => Number(e["id"]) === 3);
      expect(unchangedEvent!["updated_by"]).toEqual(baseEvent.updated_by);
      expect(unchangedEvent!["updated_at"]).toEqual(baseEvent.updated_at);
    });
  });
});
