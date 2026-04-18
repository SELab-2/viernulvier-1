import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getHalls,
  getHall,
  getHallWithMeta,
  createHall,
  replaceHall,
  updateHall,
  deleteHall,
} from "@/services/halls";

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

const hallInput = {
  vendor_id: 1,
  address: "Sint-Pietersnieuwstraat 23, 9000 Gent",
  name: { nl: "Grote Zaal", en: "Main Hall" },
};

const hallPayload = { id: 1, ...hallInput };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => vi.stubGlobal("fetch", mockOk(hallPayload)));
afterEach(() => vi.unstubAllGlobals());

describe("getHalls", () => {
  it("GETs /api/v1/hall", async () => {
    vi.stubGlobal("fetch", mockOk([hallPayload]));
    await getHalls();
    expect(lastCall()[0]).toBe("/api/v1/hall");
    expect(lastCall()[1].method).toBeUndefined();
  });
});

describe("getHall", () => {
  it("GETs /api/v1/hall/:id", async () => {
    await getHall(1);
    expect(lastCall()[0]).toBe("/api/v1/hall/1");
  });
});

describe("getHallWithMeta", () => {
  it("GETs /api/v1/hall/:id/meta", async () => {
    await getHallWithMeta(1);
    expect(lastCall()[0]).toBe("/api/v1/hall/1/meta");
  });
});

describe("createHall", () => {
  it("POSTs to /api/v1/hall", async () => {
    await createHall(hallInput);
    expect(lastCall()[0]).toBe("/api/v1/hall");
    expect(lastCall()[1].method).toBe("POST");
  });

  it("sends payload as JSON body", async () => {
    await createHall(hallInput);
    expect(lastCall()[1].body).toBe(JSON.stringify(hallInput));
  });
});

describe("replaceHall", () => {
  it("PUTs to /api/v1/hall/:id", async () => {
    await replaceHall(1, hallInput);
    expect(lastCall()[0]).toBe("/api/v1/hall/1");
    expect(lastCall()[1].method).toBe("PUT");
  });
});

describe("updateHall", () => {
  it("PATCHes /api/v1/hall/:id", async () => {
    await updateHall(1, { address: "Nieuw adres 1" });
    expect(lastCall()[0]).toBe("/api/v1/hall/1");
    expect(lastCall()[1].method).toBe("PATCH");
  });
});

describe("deleteHall", () => {
  it("DELETEs /api/v1/hall/:id", async () => {
    vi.stubGlobal("fetch", mockOk({}, 204));
    await deleteHall(1);
    expect(lastCall()[0]).toBe("/api/v1/hall/1");
    expect(lastCall()[1].method).toBe("DELETE");
  });
});
