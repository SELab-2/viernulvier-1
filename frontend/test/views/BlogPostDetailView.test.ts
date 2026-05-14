import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import BlogPostDetailView from "@/views/BlogPostDetailView.vue";
import { ApiError } from "@/services/api";
import type { BlogPost } from "@viernulvier/shared";

// ─── Mock the blogposts service ────────────────────────────────────────────

const getBlogPostMock = vi.fn();

vi.mock("@/services/blogposts", () => ({
  getBlogPost: (id: number) => getBlogPostMock(id),
}));

// ─── Mock matchMedia (jsdom does not provide it) ────────────────────────────

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

const publishedAt = new Date("2026-03-15T10:00:00Z");

const samplePost: BlogPost = {
  id: 42,
  blog: 1,
  title: { nl: "Hallo wereld", en: "Hello world" },
  content: { 
    nl: "<p>Dit is de blog body.</p><p>Met twee regels.</p>", 
    en: "<p>This is the blog body.</p><p>With two lines.</p>",
  },
  published_at: publishedAt,
};

async function mountView(id: string = "42", lang: "nl" | "fr" | "en" = "nl") {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(`/${lang}/blog/post/${id}`);
  await router.isReady();

  i18n.global.locale.value = lang;

  const wrapper = mount(BlogPostDetailView, {
    props: { id },
    global: { plugins: [router, i18n] },
    attachTo: document.body,
  });

  return { wrapper, router };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("BlogPostDetailView.vue", () => {
  beforeEach(() => {
    getBlogPostMock.mockReset();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });

  // ── Loading state ───────────────────────────────────────────────────────

  describe("loading state", () => {
    it("shows a loading indicator immediately after mount", async () => {
      // Never-resolving promise keeps us in the loading state
      getBlogPostMock.mockImplementation(() => new Promise(() => {}));

      const { wrapper } = await mountView();

      expect(wrapper.find('[role="status"]').exists()).toBe(true);
      wrapper.unmount();
    });
  });

  // ── Happy path ──────────────────────────────────────────────────────────

  describe("when the post loads successfully", () => {
    it("renders the post title in the correct language", async () => {
      getBlogPostMock.mockResolvedValue(samplePost);

      const { wrapper } = await mountView("42", "nl");
      await flushPromises();

      expect(wrapper.find("h1").text()).toBe("Hallo wereld");
    });

    it("renders the content in the correct language", async () => {
      getBlogPostMock.mockResolvedValue(samplePost);

      const { wrapper } = await mountView("42", "en");
      await flushPromises();

      const body = wrapper.find(".post-body");
      expect(body.exists()).toBe(true);
      expect(body.text()).toContain("This is the blog body.");
      expect(body.text()).toContain("With two lines.");
    });

    it("renders the published date", async () => {
      getBlogPostMock.mockResolvedValue(samplePost);

      const { wrapper } = await mountView();
      await flushPromises();

      // The exact format depends on the locale; just ensure the year is present.
      expect(wrapper.text()).toContain("2026");
    });

    it("renders an empty body when content.body is not a string", async () => {
      getBlogPostMock.mockResolvedValue({
        ...samplePost,
        content: { body: 123 as unknown as string },
      });

      const { wrapper } = await mountView();
      await flushPromises();

      expect(wrapper.find(".post-body").text()).toBe("");
    });

    it("calls getBlogPost with the numeric id from the route", async () => {
      getBlogPostMock.mockResolvedValue(samplePost);

      await mountView("42");
      await flushPromises();

      expect(getBlogPostMock).toHaveBeenCalledWith(42);
    });
  });

  // ── Not found state ─────────────────────────────────────────────────────

  describe("when the post is not found", () => {
    it("shows a not-found message when the service throws a 404 ApiError", async () => {
      getBlogPostMock.mockRejectedValue(new ApiError(404, "Not found"));

      const { wrapper } = await mountView();
      await flushPromises();

      const alert = wrapper.find('[role="alert"]');
      expect(alert.exists()).toBe(true);
      // The default locale is nl, so expect the Dutch not-found copy.
      expect(alert.text()).toContain("Blogpost niet gevonden");
    });

    it("shows a not-found message when the id is not a valid integer", async () => {
      getBlogPostMock.mockResolvedValue(samplePost);

      const { wrapper } = await mountView("abc");
      await flushPromises();

      expect(wrapper.find('[role="alert"]').exists()).toBe(true);
      expect(getBlogPostMock).not.toHaveBeenCalled();
    });

    it("shows a not-found message when the id is zero or negative", async () => {
      getBlogPostMock.mockResolvedValue(samplePost);

      const { wrapper } = await mountView("0");
      await flushPromises();

      expect(wrapper.find('[role="alert"]').exists()).toBe(true);
      expect(getBlogPostMock).not.toHaveBeenCalled();
    });
  });

  // ── Generic error state ─────────────────────────────────────────────────

  describe("when the service throws a non-404 error", () => {
    it("shows a generic error message", async () => {
      getBlogPostMock.mockRejectedValue(new Error("network failed"));

      const { wrapper } = await mountView();
      await flushPromises();

      expect(wrapper.find('[role="alert"]').exists()).toBe(true);
      // Not the "not-found" heading
      expect(wrapper.find("h1").exists()).toBe(false);
    });

    it("shows a generic error message for non-404 ApiErrors", async () => {
      getBlogPostMock.mockRejectedValue(new ApiError(500, "Server error"));

      const { wrapper } = await mountView();
      await flushPromises();

      expect(wrapper.find('[role="alert"]').exists()).toBe(true);
      // Not the "not-found" heading
      expect(wrapper.find("h1").exists()).toBe(false);
    });
  });

  // ── Layout composition ──────────────────────────────────────────────────

  describe("layout composition", () => {
    it("always renders the navbar and footer", async () => {
      getBlogPostMock.mockResolvedValue(samplePost);

      const { wrapper } = await mountView();
      await flushPromises();

      expect(wrapper.find("nav").exists()).toBe(true);
      expect(wrapper.find("footer").exists()).toBe(true);
    });
  });
});
