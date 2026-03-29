import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getEvents,
  getEvent,
  getEventWithMeta,
  createEvent,
  replaceEvent,
  updateEvent,
  bulkUpdateEvents,
  deleteEvent,
} from "@/services/events";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockOk(body: unknown = {}, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status,
    statusText: "OK",
    json: vi.fn().mockResolvedValue(body),
  });
}

function lastCall(): [string, RequestInit] {
  const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls as [
    string,
    RequestInit,
  ][];
  return calls[calls.length - 1]!;
}

const eventInput = {
  production: 1,
  hall: 2,
  starts_at: "2025-04-12T20:00:00",
  ends_at: "2025-04-12T22:00:00",
  doors_at: "2025-04-12T19:30:00",
  vendor_id: 999,
  info: { nl: "Info" },
};

const eventPayload = { id: 7, ...eventInput };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => vi.stubGlobal("fetch", mockOk(eventPayload)));
afterEach(() => vi.unstubAllGlobals());

describe("getEvents", () => {
  it("GETs /api/v1/event", async () => {
    vi.stubGlobal("fetch", mockOk([eventPayload]));
    await getEvents();
    expect(lastCall()[0]).toBe("/api/v1/event");
    expect(lastCall()[1].method).toBeUndefined();
  });
});

describe("getEvent", () => {
  it("GETs /api/v1/event/:id", async () => {
    await getEvent(7);
    expect(lastCall()[0]).toBe("/api/v1/event/7");
  });
});

describe("getEventWithMeta", () => {
  it("GETs /api/v1/event/:id/meta", async () => {
    await getEventWithMeta(7);
    expect(lastCall()[0]).toBe("/api/v1/event/7/meta");
  });
});

describe("createEvent", () => {
  it("POSTs to /api/v1/event", async () => {
    await createEvent(eventInput);
    expect(lastCall()[0]).toBe("/api/v1/event");
    expect(lastCall()[1].method).toBe("POST");
  });

  it("sends payload as JSON body", async () => {
    await createEvent(eventInput);
    expect(lastCall()[1].body).toBe(JSON.stringify(eventInput));
  });
});

describe("replaceEvent", () => {
  it("PUTs to /api/v1/event/:id", async () => {
    await replaceEvent(7, eventInput);
    expect(lastCall()[0]).toBe("/api/v1/event/7");
    expect(lastCall()[1].method).toBe("PUT");
  });
});

describe("updateEvent", () => {
  it("PATCHes /api/v1/event/:id", async () => {
    await updateEvent(7, { info: { nl: "Uitverkocht" } });
    expect(lastCall()[0]).toBe("/api/v1/event/7");
    expect(lastCall()[1].method).toBe("PATCH");
  });
});

describe("bulkUpdateEvents", () => {
  it("PATCHes /api/v1/event", async () => {
    vi.stubGlobal("fetch", mockOk([eventPayload]));
    await bulkUpdateEvents([{ id: 1, info: { nl: "x" } }]);
    expect(lastCall()[0]).toBe("/api/v1/event");
    expect(lastCall()[1].method).toBe("PATCH");
  });
});

describe("deleteEvent", () => {
  it("DELETEs /api/v1/event/:id", async () => {
    vi.stubGlobal("fetch", mockOk({}, 204));
    await deleteEvent(7);
    expect(lastCall()[0]).toBe("/api/v1/event/7");
    expect(lastCall()[1].method).toBe("DELETE");
  });
});
