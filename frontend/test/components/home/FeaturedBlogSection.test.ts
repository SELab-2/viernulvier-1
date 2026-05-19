import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import type { BlogPostWithBackwardsRefs } from "@viernulvier/shared";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import { ApiError } from "@/services/api";
import * as blogpostsService from "@/services/blogposts";
import FeaturedBlogSection from "@/components/home/FeaturedBlogSection.vue";

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

const FEATURED_POST_ID = 1;

function makePost(overrides: Partial<BlogPostWithBackwardsRefs> = {}): BlogPostWithBackwardsRefs {
  return {
    id: FEATURED_POST_ID,
    blog: 1,
    title: { nl: "Uitgelichte post", en: "Featured post" },
    content: { nl: "## Eerste sectie\n\nDit is de eerste alinea.\n\nDit is de tweede alinea." },
    published_at: new Date("2024-06-01T00:00:00.000Z"),
    productions: [],
    ...overrides,
  } as BlogPostWithBackwardsRefs;
}

async function mountSection(lang: "nl" | "fr" | "en" = "nl") {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(`/${lang}`);
  await router.isReady();

  i18n.global.locale.value = lang;

  const wrapper = mount(FeaturedBlogSection, {
    global: { plugins: [router, i18n] },
    attachTo: document.body,
  });

  return { wrapper, router };
}

describe("FeaturedBlogSection.vue", () => {
  beforeEach(() => {
    vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue([makePost()]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    i18n.global.locale.value = "nl";
  });

  describe("loading state", () => {
    it("shows the skeleton while the post is loading", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockReturnValue(new Promise(() => {}));

      const { wrapper } = await mountSection();

      expect(wrapper.find('[role="status"]').exists()).toBe(true);
      expect(wrapper.find("article").exists()).toBe(false);
      wrapper.unmount();
    });

    it("shows the eyebrow text immediately, even while loading", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockReturnValue(new Promise(() => {}));

      const { wrapper } = await mountSection();

      expect(wrapper.text()).toContain(i18n.global.t("featuredBlog.eyebrow"));
      wrapper.unmount();
    });

    it("hides the skeleton after the post loads", async () => {
      const { wrapper } = await mountSection();
      await flushPromises();

      expect(wrapper.find('[role="status"]').exists()).toBe(false);
      wrapper.unmount();
    });
  });

  describe("error state", () => {
    it("renders nothing (no article, no skeleton) when the fetch fails", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockRejectedValue(new ApiError(404, "Not found"));

      const { wrapper } = await mountSection();
      await flushPromises();

      expect(wrapper.find("article").exists()).toBe(false);
      expect(wrapper.find('[role="status"]').exists()).toBe(false);
      wrapper.unmount();
    });

    it("still shows the eyebrow text when the fetch fails", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockRejectedValue(new Error("network"));

      const { wrapper } = await mountSection();
      await flushPromises();

      expect(wrapper.text()).toContain(i18n.global.t("featuredBlog.eyebrow"));
      wrapper.unmount();
    });
  });

  describe("happy path", () => {
    it("renders the article after the post loads", async () => {
      const { wrapper } = await mountSection();
      await flushPromises();

      expect(wrapper.find("article").exists()).toBe(true);
      wrapper.unmount();
    });

    it("renders the post title in the active locale", async () => {
      const { wrapper } = await mountSection("nl");
      await flushPromises();

      expect(wrapper.find("h2").text()).toBe("Uitgelichte post");
      wrapper.unmount();
    });

    it("renders the post title in the correct locale when lang is 'en'", async () => {
      const { wrapper } = await mountSection("en");
      await flushPromises();

      expect(wrapper.find("h2").text()).toBe("Featured post");
      wrapper.unmount();
    });

    it("renders the excerpt from the first paragraph of the content", async () => {
      const { wrapper } = await mountSection();
      await flushPromises();

      const lead = wrapper.find(".article-lead");
      expect(lead.exists()).toBe(true);
      expect(lead.text()).toContain("eerste alinea");
      wrapper.unmount();
    });

    it("does not render the second paragraph in the excerpt", async () => {
      const { wrapper } = await mountSection();
      await flushPromises();

      const lead = wrapper.find(".article-lead");
      expect(lead.text()).not.toContain("tweede alinea");
      wrapper.unmount();
    });

    it("renders the published date", async () => {
      const { wrapper } = await mountSection();
      await flushPromises();

      expect(wrapper.text()).toContain("2024");
      wrapper.unmount();
    });

    it("omits the date when published_at is absent", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue(
        [makePost({ published_at: undefined })],
      );

      const { wrapper } = await mountSection();
      await flushPromises();

      const dateline = wrapper.find("article p");
      expect(dateline.text()).toBe("· Redactie");
      wrapper.unmount();
    });

    it("fetches all posts and picks the most recent one", async () => {
      const older = makePost({ id: 1, published_at: new Date("2023-01-01") });
      const newer = makePost({ id: 2, published_at: new Date("2024-06-01"), title: { nl: "Nieuwste post" } });
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue([older, newer]);

      const { wrapper } = await mountSection();
      await flushPromises();

      expect(wrapper.find("h2").text()).toBe("Nieuwste post");
      wrapper.unmount();
    });
  });

  describe("lead image", () => {
    it("renders a figure when the content contains a markdown image", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue(
        [makePost({
          content: { nl: "Intro.\n\n![Een foto](https://example.com/foto.jpg)\n\nTekst." },
        })],
      );

      const { wrapper } = await mountSection();
      await flushPromises();

      expect(wrapper.find("figure").exists()).toBe(true);
      expect(wrapper.find("figure img").attributes("src")).toBe("https://example.com/foto.jpg");
      wrapper.unmount();
    });

    it("renders a figcaption with the alt text", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue(
        [makePost({
          content: { nl: "![Beschrijving](https://example.com/foto.jpg)" },
        })],
      );

      const { wrapper } = await mountSection();
      await flushPromises();

      expect(wrapper.find("figcaption").text()).toBe("Beschrijving");
      wrapper.unmount();
    });

    it("omits figcaption when the alt text is empty", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue(
        [makePost({
          content: { nl: "![](https://example.com/foto.jpg)" },
        })],
      );

      const { wrapper } = await mountSection();
      await flushPromises();

      expect(wrapper.find("figcaption").exists()).toBe(false);
      wrapper.unmount();
    });

    it("omits the figure when the content has no image", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue(
        [makePost({ content: { nl: "Geen afbeelding hier." } })],
      );

      const { wrapper } = await mountSection();
      await flushPromises();

      expect(wrapper.find("figure").exists()).toBe(false);
      wrapper.unmount();
    });
  });

  describe("navigation", () => {
    it("title link points to the blog post detail route", async () => {
      const { wrapper } = await mountSection();
      await flushPromises();

      const titleLink = wrapper.find("h2 a");
      expect(titleLink.exists()).toBe(true);
      expect(titleLink.attributes("href")).toMatch(/\/nl\/blog\/post\/1$/);
      wrapper.unmount();
    });

    it("read-more link points to the blog post detail route", async () => {
      const { wrapper } = await mountSection();
      await flushPromises();

      const links = wrapper.findAll("a").filter((a) =>
        /\/blog\/post\/\d+$/.test(a.attributes("href") ?? ""),
      );
      expect(links.length).toBeGreaterThanOrEqual(2); // title + read-more
      wrapper.unmount();
    });

    it("read-more link shows the correct i18n label", async () => {
      const { wrapper } = await mountSection();
      await flushPromises();

      const readMore = wrapper.findAll("a").find((a) =>
        a.text().includes(i18n.global.t("featuredBlog.readMore")),
      );
      expect(readMore).toBeDefined();
      wrapper.unmount();
    });
  });
});
