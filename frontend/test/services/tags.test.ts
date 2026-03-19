import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getTags,
  getTag,
  getAllTags,
  getTagAdmin,
  getTagWithMeta,
  createTag,
  replaceTag,
  updateTag,
  deleteTag,
  getTagTypes,
  getTagType,
  getTagTypeWithMeta,
  createTagType,
  replaceTagType,
  updateTagType,
  deleteTagType,
} from "@/services/tags";

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

const tagPayload = { id: 1, name: { nl: "Drama" }, type: 1, public: true };
const tagTypePayload = { id: 1, name: { nl: "Genre" } };

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

beforeEach(() => vi.stubGlobal("fetch", mockOk(tagPayload)));
afterEach(() => vi.unstubAllGlobals());

describe("getTags", () => {
  it("GETs /api/v1/tags", async () => {
    vi.stubGlobal("fetch", mockOk([tagPayload]));
    await getTags();
    expect(lastCall()[0]).toBe("/api/v1/tags");
  });
});

describe("getTag", () => {
  it("GETs /api/v1/tags/:id", async () => {
    await getTag(1);
    expect(lastCall()[0]).toBe("/api/v1/tags/1");
  });
});

describe("getAllTags", () => {
  it("GETs /api/v1/tags/all", async () => {
    vi.stubGlobal("fetch", mockOk([tagPayload]));
    await getAllTags();
    expect(lastCall()[0]).toBe("/api/v1/tags/all");
  });
});

describe("getTagAdmin", () => {
  it("GETs /api/v1/tags/:id/all", async () => {
    await getTagAdmin(1);
    expect(lastCall()[0]).toBe("/api/v1/tags/1/all");
  });
});

describe("getTagWithMeta", () => {
  it("GETs /api/v1/tags/:id/meta", async () => {
    await getTagWithMeta(1);
    expect(lastCall()[0]).toBe("/api/v1/tags/1/meta");
  });
});

describe("createTag", () => {
  it("POSTs to /api/v1/tags", async () => {
    const input = { name: { nl: "Drama" }, type: 1, public: true };
    await createTag(input);
    expect(lastCall()[0]).toBe("/api/v1/tags");
    expect(lastCall()[1].method).toBe("POST");
    expect(lastCall()[1].body).toBe(JSON.stringify(input));
  });
});

describe("replaceTag", () => {
  it("PUTs to /api/v1/tags/:id", async () => {
    await replaceTag(1, { name: { nl: "Komedie" }, type: 1, public: true });
    expect(lastCall()[0]).toBe("/api/v1/tags/1");
    expect(lastCall()[1].method).toBe("PUT");
  });
});

describe("updateTag", () => {
  it("PATCHes /api/v1/tags/:id", async () => {
    await updateTag(1, { public: false });
    expect(lastCall()[0]).toBe("/api/v1/tags/1");
    expect(lastCall()[1].method).toBe("PATCH");
  });
});

describe("deleteTag", () => {
  it("DELETEs /api/v1/tags/:id", async () => {
    vi.stubGlobal("fetch", mockOk({}, 204));
    await deleteTag(1);
    expect(lastCall()[0]).toBe("/api/v1/tags/1");
    expect(lastCall()[1].method).toBe("DELETE");
  });
});

// ---------------------------------------------------------------------------
// TagTypes
// ---------------------------------------------------------------------------

describe("getTagTypes", () => {
  it("GETs /api/v1/tags/type", async () => {
    vi.stubGlobal("fetch", mockOk([tagTypePayload]));
    await getTagTypes();
    expect(lastCall()[0]).toBe("/api/v1/tags/type");
  });
});

describe("getTagType", () => {
  it("GETs /api/v1/tags/type/:id", async () => {
    vi.stubGlobal("fetch", mockOk(tagTypePayload));
    await getTagType(1);
    expect(lastCall()[0]).toBe("/api/v1/tags/type/1");
  });
});

describe("getTagTypeWithMeta", () => {
  it("GETs /api/v1/tags/type/:id/meta", async () => {
    vi.stubGlobal("fetch", mockOk(tagTypePayload));
    await getTagTypeWithMeta(1);
    expect(lastCall()[0]).toBe("/api/v1/tags/type/1/meta");
  });
});

describe("createTagType", () => {
  it("POSTs to /api/v1/tags/type", async () => {
    vi.stubGlobal("fetch", mockOk(tagTypePayload, 201));
    const input = { name: { nl: "Genre" } };
    await createTagType(input);
    expect(lastCall()[0]).toBe("/api/v1/tags/type");
    expect(lastCall()[1].method).toBe("POST");
    expect(lastCall()[1].body).toBe(JSON.stringify(input));
  });
});

describe("replaceTagType", () => {
  it("PUTs to /api/v1/tags/type/:id", async () => {
    vi.stubGlobal("fetch", mockOk(tagTypePayload));
    await replaceTagType(1, { name: { nl: "Nieuw Genre" } });
    expect(lastCall()[0]).toBe("/api/v1/tags/type/1");
    expect(lastCall()[1].method).toBe("PUT");
  });
});

describe("updateTagType", () => {
  it("PATCHes /api/v1/tags/type/:id", async () => {
    vi.stubGlobal("fetch", mockOk(tagTypePayload));
    await updateTagType(1, { name: { en: "Genre" } });
    expect(lastCall()[0]).toBe("/api/v1/tags/type/1");
    expect(lastCall()[1].method).toBe("PATCH");
  });
});

describe("deleteTagType", () => {
  it("DELETEs /api/v1/tags/type/:id", async () => {
    vi.stubGlobal("fetch", mockOk({}, 204));
    await deleteTagType(1);
    expect(lastCall()[0]).toBe("/api/v1/tags/type/1");
    expect(lastCall()[1].method).toBe("DELETE");
  });
});
