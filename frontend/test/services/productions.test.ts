import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getProductions,
  getProduction,
  getProductionWithMeta,
  createProduction,
  replaceProduction,
  updateProduction,
  bulkUpdateProductions,
  deleteProduction,
} from "@/services/productions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockOk(body: unknown = [], status = 200) {
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

const minimalInput = {
  vendor_id: 1,
  box_office_id: 100,
  title: { nl: "Hamlet" },
  artist: { nl: "Shakespeare" },
  tagline: { nl: "To be or not to be." },
  teaser: { nl: "Een tijdloos drama." },
};

const productionPayload = { id: 1, ...minimalInput };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => vi.stubGlobal("fetch", mockOk(productionPayload)));
afterEach(() => vi.unstubAllGlobals());

describe("getProductions", () => {
  it("GETs /api/v1/production", async () => {
    vi.stubGlobal(
      "fetch",
      mockOk({ items: [productionPayload], total: 1 }),
    );
    const page = await getProductions();
    expect(page).toEqual({ items: [productionPayload], total: 1 });
    expect(lastCall()[0]).toBe("/api/v1/production");
    expect(lastCall()[1].method).toBeUndefined();
  });

  it("GETs /api/v1/production with limit and offset", async () => {
    vi.stubGlobal(
      "fetch",
      mockOk({ items: [productionPayload], total: 100 }),
    );
    await getProductions({ limit: 20, offset: 40 });
    expect(lastCall()[0]).toBe("/api/v1/production?limit=20&offset=40");
  });

  it("GETs /api/v1/production with search and pagination", async () => {
    vi.stubGlobal(
      "fetch",
      mockOk({ items: [productionPayload], total: 3 }),
    );
    await getProductions({ limit: 20, offset: 0, search: "  Hamlet  " });
    expect(lastCall()[0]).toBe("/api/v1/production?limit=20&offset=0&search=Hamlet");
  });

  it("GETs /api/v1/production with multiple search terms", async () => {
    vi.stubGlobal(
      "fetch",
      mockOk({ items: [productionPayload], total: 1 }),
    );
    await getProductions({
      limit: 10,
      offset: 0,
      search: ["  foo ", "bar"],
    });
    expect(lastCall()[0]).toBe(
      "/api/v1/production?limit=10&offset=0&search=foo&search=bar",
    );
  });
});

describe("getProduction", () => {
  it("GETs /api/v1/production/:id", async () => {
    await getProduction(1);
    expect(lastCall()[0]).toBe("/api/v1/production/1");
  });

  it("uses the correct id in the URL", async () => {
    await getProduction(42);
    expect(lastCall()[0]).toBe("/api/v1/production/42");
  });
});

describe("getProductionWithMeta", () => {
  it("GETs /api/v1/production/:id/meta", async () => {
    await getProductionWithMeta(5);
    expect(lastCall()[0]).toBe("/api/v1/production/5/meta");
  });
});

describe("createProduction", () => {
  it("POSTs to /api/v1/production", async () => {
    await createProduction(minimalInput);
    expect(lastCall()[0]).toBe("/api/v1/production");
    expect(lastCall()[1].method).toBe("POST");
  });

  it("sends the payload as the JSON body", async () => {
    await createProduction(minimalInput);
    expect(lastCall()[1].body).toBe(JSON.stringify(minimalInput));
  });
});

describe("replaceProduction", () => {
  it("PUTs to /api/v1/production/:id", async () => {
    await replaceProduction(3, minimalInput);
    expect(lastCall()[0]).toBe("/api/v1/production/3");
    expect(lastCall()[1].method).toBe("PUT");
  });
});

describe("updateProduction", () => {
  it("PATCHes /api/v1/production/:id", async () => {
    await updateProduction(3, { title: { nl: "Nieuwe titel" } });
    expect(lastCall()[0]).toBe("/api/v1/production/3");
    expect(lastCall()[1].method).toBe("PATCH");
  });
});

describe("bulkUpdateProductions", () => {
  it("PATCHes /api/v1/production/bulk", async () => {
    vi.stubGlobal("fetch", mockOk([productionPayload]));
    await bulkUpdateProductions({ ids: [1, 2], data: { title: { nl: "x" } } });
    expect(lastCall()[0]).toBe("/api/v1/production/bulk");
    expect(lastCall()[1].method).toBe("PATCH");
  });

  it("sends ids and data in the body", async () => {
    vi.stubGlobal("fetch", mockOk([productionPayload]));
    const input = { ids: [1, 2], data: { title: { en: "x" } } };
    await bulkUpdateProductions(input);
    expect(lastCall()[1].body).toBe(JSON.stringify(input));
  });
});

describe("deleteProduction", () => {
  it("DELETEs /api/v1/production/:id", async () => {
    vi.stubGlobal("fetch", mockOk({}, 204));
    await deleteProduction(7);
    expect(lastCall()[0]).toBe("/api/v1/production/7");
    expect(lastCall()[1].method).toBe("DELETE");
  });
});
