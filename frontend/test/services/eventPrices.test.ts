import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getEventPrices,
  getEventPrice,
  getEventPriceWithMeta,
  createEventPrice,
  replaceEventPrice,
  updateEventPrice,
  deleteEventPrice,
} from "@/services/eventPrices";

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

const pricePayload = { id: 5, event: 7, amount: 18.5 };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => vi.stubGlobal("fetch", mockOk(pricePayload)));
afterEach(() => vi.unstubAllGlobals());

describe("getEventPrices", () => {
  it("GETs /api/v1/event_price", async () => {
    vi.stubGlobal("fetch", mockOk([pricePayload]));
    await getEventPrices();
    expect(lastCall()[0]).toBe("/api/v1/event_price");
    expect(lastCall()[1].method).toBeUndefined();
  });
});

describe("getEventPrice", () => {
  it("GETs /api/v1/event_price/:id", async () => {
    await getEventPrice(5);
    expect(lastCall()[0]).toBe("/api/v1/event_price/5");
  });
});

describe("getEventPriceWithMeta", () => {
  it("GETs /api/v1/event_price/:id/meta", async () => {
    await getEventPriceWithMeta(5);
    expect(lastCall()[0]).toBe("/api/v1/event_price/5/meta");
  });
});

describe("createEventPrice", () => {
  it("POSTs to /api/v1/event_price", async () => {
    const input = { event: 7, amount: 18.5 };
    await createEventPrice(input);
    expect(lastCall()[0]).toBe("/api/v1/event_price");
    expect(lastCall()[1].method).toBe("POST");
    expect(lastCall()[1].body).toBe(JSON.stringify(input));
  });
});

describe("replaceEventPrice", () => {
  it("PUTs to /api/v1/event_price/:id", async () => {
    await replaceEventPrice(5, { event: 7, amount: 20.0 });
    expect(lastCall()[0]).toBe("/api/v1/event_price/5");
    expect(lastCall()[1].method).toBe("PUT");
  });
});

describe("updateEventPrice", () => {
  it("PATCHes /api/v1/event_price/:id", async () => {
    await updateEventPrice(5, { amount: 22.0 });
    expect(lastCall()[0]).toBe("/api/v1/event_price/5");
    expect(lastCall()[1].method).toBe("PATCH");
  });
});

describe("deleteEventPrice", () => {
  it("DELETEs /api/v1/event_price/:id", async () => {
    vi.stubGlobal("fetch", mockOk({}, 204));
    await deleteEventPrice(5);
    expect(lastCall()[0]).toBe("/api/v1/event_price/5");
    expect(lastCall()[1].method).toBe("DELETE");
  });
});
