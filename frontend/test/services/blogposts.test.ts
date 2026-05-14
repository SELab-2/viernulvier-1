import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getBlogPost, getAllBlogPosts, getBlogPostAdmin, updateBlogPost } from "@/services/blogposts";
import { ApiError } from "@/services/api";

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

function mockError(body: unknown, status: number, statusText: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
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

function lastCallBody(): unknown {
  const [, init] = lastCall();
  return init.body ? JSON.parse(init.body as string) : undefined;
}

const samplePost = {
  id: 42,
  blog: 1,
  title: { nl: "Hallo wereld", en: "Hello world" },
  content: { nl: "Wat tekst.", en: "Some text." },
  published_at: "2026-03-15T10:00:00.000Z",
};

const sampleDraft = {
  id: 7,
  blog: 1,
  title: { nl: "Klad", en: "Draft" },
  content: { nl: "Nog niet klaar.", en: "Not yet done." },
  published_at: null,
};

// ---------------------------------------------------------------------------
// getBlogPost (existing — kept for regression)
// ---------------------------------------------------------------------------

describe("getBlogPost", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockOk(samplePost)));
  afterEach(() => vi.unstubAllGlobals());

  it("GETs /api/v1/blog/post/:id", async () => {
    await getBlogPost(42);
    expect(lastCall()[0]).toBe("/api/v1/blog/post/42");
    expect(lastCall()[1].method).toBeUndefined();
  });

  it("uses the correct id in the URL", async () => {
    await getBlogPost(7);
    expect(lastCall()[0]).toBe("/api/v1/blog/post/7");
  });

  it("returns the parsed response body", async () => {
    const result = await getBlogPost(42);
    expect(result).toEqual(samplePost);
  });

  it("throws ApiError on 404", async () => {
    vi.stubGlobal("fetch", mockError({ error: "Not found" }, 404, "Not Found"));
    await expect(getBlogPost(999)).rejects.toMatchObject({ status: 404 });
    await expect(getBlogPost(999)).rejects.toBeInstanceOf(ApiError);
  });

  it("throws ApiError on generic server error", async () => {
    vi.stubGlobal("fetch", mockError({ error: "Internal Server Error" }, 500, "Internal Server Error"));
    await expect(getBlogPost(1)).rejects.toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// getAllBlogPosts
// ---------------------------------------------------------------------------

describe("getAllBlogPosts", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockOk([samplePost, sampleDraft])));
  afterEach(() => vi.unstubAllGlobals());

  it("GETs /api/v1/blog/post/all", async () => {
    await getAllBlogPosts();
    expect(lastCall()[0]).toBe("/api/v1/blog/post/all");
    expect(lastCall()[1].method).toBeUndefined();
  });

  it("returns an array of blogposts including drafts", async () => {
    const result = await getAllBlogPosts();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(samplePost);
    expect(result[1]).toEqual(sampleDraft);
  });

  it("returns an empty array when there are no posts", async () => {
    vi.stubGlobal("fetch", mockOk([]));
    const result = await getAllBlogPosts();
    expect(result).toEqual([]);
  });

  it("throws ApiError on 401", async () => {
    vi.stubGlobal("fetch", mockError({ error: "Unauthorized" }, 401, "Unauthorized"));
    await expect(getAllBlogPosts()).rejects.toBeInstanceOf(ApiError);
    await expect(getAllBlogPosts()).rejects.toMatchObject({ status: 401 });
  });

  it("throws ApiError on generic server error", async () => {
    vi.stubGlobal("fetch", mockError({ error: "Internal Server Error" }, 500, "Internal Server Error"));
    await expect(getAllBlogPosts()).rejects.toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// getBlogPostAdmin
// ---------------------------------------------------------------------------

describe("getBlogPostAdmin", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockOk(sampleDraft)));
  afterEach(() => vi.unstubAllGlobals());

  it("GETs /api/v1/blog/post/:id/all", async () => {
    await getBlogPostAdmin(7);
    expect(lastCall()[0]).toBe("/api/v1/blog/post/7/all");
    expect(lastCall()[1].method).toBeUndefined();
  });

  it("uses the correct id in the URL", async () => {
    await getBlogPostAdmin(42);
    expect(lastCall()[0]).toBe("/api/v1/blog/post/42/all");
  });

  it("returns the parsed response body for a draft", async () => {
    const result = await getBlogPostAdmin(7);
    expect(result).toEqual(sampleDraft);
    expect(result.published_at).toBeNull();
  });

  it("returns the parsed response body for a published post", async () => {
    vi.stubGlobal("fetch", mockOk(samplePost));
    const result = await getBlogPostAdmin(42);
    expect(result).toEqual(samplePost);
  });

  it("throws ApiError on 401", async () => {
    vi.stubGlobal("fetch", mockError({ error: "Unauthorized" }, 401, "Unauthorized"));
    await expect(getBlogPostAdmin(7)).rejects.toBeInstanceOf(ApiError);
    await expect(getBlogPostAdmin(7)).rejects.toMatchObject({ status: 401 });
  });

  it("throws ApiError on 404", async () => {
    vi.stubGlobal("fetch", mockError({ error: "Not found" }, 404, "Not Found"));
    await expect(getBlogPostAdmin(999)).rejects.toBeInstanceOf(ApiError);
    await expect(getBlogPostAdmin(999)).rejects.toMatchObject({ status: 404 });
  });
});

// ---------------------------------------------------------------------------
// updateBlogPost
// ---------------------------------------------------------------------------

describe("updateBlogPost", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockOk(samplePost)));
  afterEach(() => vi.unstubAllGlobals());

  it("PATCHes /api/v1/blog/post/:id", async () => {
    await updateBlogPost(42, { published_at: null });
    expect(lastCall()[0]).toBe("/api/v1/blog/post/42");
    expect(lastCall()[1].method).toBe("PATCH");
  });

  it("uses the correct id in the URL", async () => {
    await updateBlogPost(7, { published_at: null });
    expect(lastCall()[0]).toBe("/api/v1/blog/post/7");
  });

  it("sends only the provided fields in the request body", async () => {
    await updateBlogPost(42, { published_at: null });
    expect(lastCallBody()).toEqual({ published_at: null });
  });

  it("can publish a post by setting published_at", async () => {
    const isoDate = "2026-05-01T12:00:00.000Z";
    await updateBlogPost(42, { published_at: isoDate });
    expect(lastCallBody()).toEqual({ published_at: isoDate });
  });

  it("can update the title language map", async () => {
    const title = { nl: "Nieuw", en: "New" };
    await updateBlogPost(42, { title });
    expect(lastCallBody()).toEqual({ title });
  });

  it("can update multiple fields in one call", async () => {
    const patch = {
      title: { nl: "Bijgewerkt", en: "Updated" },
      published_at: "2026-05-01T12:00:00.000Z",
    };
    await updateBlogPost(42, patch);
    expect(lastCallBody()).toEqual(patch);
  });

  it("returns the updated blogpost from the response", async () => {
    const updated = { ...samplePost, published_at: null };
    vi.stubGlobal("fetch", mockOk(updated));
    const result = await updateBlogPost(42, { published_at: null });
    expect(result).toEqual(updated);
  });

  it("throws ApiError on 401", async () => {
    vi.stubGlobal("fetch", mockError({ error: "Unauthorized" }, 401, "Unauthorized"));
    await expect(updateBlogPost(42, {})).rejects.toBeInstanceOf(ApiError);
    await expect(updateBlogPost(42, {})).rejects.toMatchObject({ status: 401 });
  });

  it("throws ApiError on 404", async () => {
    vi.stubGlobal("fetch", mockError({ error: "Not found" }, 404, "Not Found"));
    await expect(updateBlogPost(999, {})).rejects.toBeInstanceOf(ApiError);
    await expect(updateBlogPost(999, {})).rejects.toMatchObject({ status: 404 });
  });

  it("throws ApiError on generic server error", async () => {
    vi.stubGlobal("fetch", mockError({ error: "Internal Server Error" }, 500, "Internal Server Error"));
    await expect(updateBlogPost(42, {})).rejects.toBeInstanceOf(ApiError);
  });
});