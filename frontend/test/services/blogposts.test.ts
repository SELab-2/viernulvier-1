import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getBlogPost,
  getBlogPosts,
  getBlogPostWithMeta,
  createBlogPost,
  replaceBlogPost,
  updateBlogPost,
  deleteBlogPost,
} from "@/services/blogposts";
import { apiFetch } from "@/services/api";

vi.mock("@/services/api", () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

const samplePost = {
  id: 42,
  blog: 1,
  title: { en: "Hello world" },
  content: { en: "Some text." },
  published_at: "2026-03-15T10:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedApiFetch.mockResolvedValue(samplePost);
});

describe("blogposts service", () => {
  describe("getBlogPosts", () => {
    it("fetches all blogposts", async () => {
      await getBlogPosts();

      expect(mockedApiFetch).toHaveBeenCalledWith("/blog/post");
    });
  });

  describe("getBlogPost", () => {
    it("fetches a single blogpost by id", async () => {
      await getBlogPost(42);

      expect(mockedApiFetch).toHaveBeenCalledWith("/blog/post/42");
    });

    it("returns the parsed response body", async () => {
      const result = await getBlogPost(42);

      expect(result).toEqual(samplePost);
    });
  });

  describe("getBlogPostWithMeta", () => {
    it("fetches a blogpost with metadata", async () => {
      await getBlogPostWithMeta(42);

      expect(mockedApiFetch).toHaveBeenCalledWith(
        "/blog/post/42/meta",
      );
    });
  });

  describe("createBlogPost", () => {
    it("POSTs a new blogpost", async () => {
      const payload = {
        blog: 1,
        title: { en: "New post" },
        content: { en: "Body" },
      };

      await createBlogPost(payload);

      expect(mockedApiFetch).toHaveBeenCalledWith("/blog/post", {
        method: "POST",
        body: payload,
      });
    });
  });

  describe("replaceBlogPost", () => {
    it("PUTs a full replacement", async () => {
      const payload = {
        blog: 1,
        title: { en: "Updated" },
        content: { en: "Updated body" },
      };

      await replaceBlogPost(42, payload);

      expect(mockedApiFetch).toHaveBeenCalledWith(
        "/blog/post/42",
        {
          method: "PUT",
          body: payload,
        },
      );
    });
  });

  describe("updateBlogPost", () => {
    it("PATCHes partial updates", async () => {
      const payload = {
        published_at: "2026-03-20T10:00:00.000Z",
      };

      await updateBlogPost(42, payload);

      expect(mockedApiFetch).toHaveBeenCalledWith(
        "/blog/post/42",
        {
          method: "PATCH",
          body: payload,
        },
      );
    });
  });

  describe("deleteBlogPost", () => {
    it("DELETEs a blogpost", async () => {
      mockedApiFetch.mockResolvedValue(undefined);

      await deleteBlogPost(42);

      expect(mockedApiFetch).toHaveBeenCalledWith(
        "/blog/post/42",
        {
          method: "DELETE",
        },
      );
    });
  });
});