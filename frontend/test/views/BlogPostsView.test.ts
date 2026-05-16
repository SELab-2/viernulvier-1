import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import type { BlogPostWithBackwardsRefs } from "@viernulvier/shared";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import { __reset as resetDarkMode } from "@/composables/useDarkMode";
import * as blogpostsService from "@/services/blogposts";


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


function makePost(overrides: Partial<BlogPostWithBackwardsRefs> = {}): BlogPostWithBackwardsRefs {
  return {
    id: 1,
    blog: 1,
    title: { nl: "Testpost" },
    content: { nl: "Inhoud van de post." },
    published_at: new Date("2024-06-01T00:00:00.000Z"),
    productions: [],
    ...overrides,
  } as BlogPostWithBackwardsRefs;
}

function makePosts(count: number, startYear = 2024): BlogPostWithBackwardsRefs[] {
  return Array.from({ length: count }, (_, i) =>
    makePost({
      id: i + 1,
      title: { nl: `Post ${i + 1}` },
      published_at: new Date(`${startYear - i}-01-01T00:00:00.000Z`),
    }),
  );
}


async function mountView(path = "/nl/blog") {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();

  const wrapper = mount({ template: "<router-view />" }, {
    global: { plugins: [router, i18n] },
    attachTo: document.body,
  });

  return { wrapper, router };
}


describe("BlogPostsView.vue", () => {
  beforeEach(() => {
    vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue([makePost()]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    resetDarkMode();
    document.documentElement.classList.remove("dark");
    document.body.innerHTML = "";
    i18n.global.locale.value = "nl";
  });

  describe("loading state", () => {
    it("shows the loading indicator while posts are being fetched", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockReturnValue(new Promise(() => {}));

      const { wrapper } = await mountView();
      await nextTick();

      expect(wrapper.find('[role="status"]').exists()).toBe(true);
      expect(wrapper.find('[role="list"]').exists()).toBe(false);
      wrapper.unmount();
    });

    it("hides the loading indicator after posts resolve", async () => {
      const { wrapper } = await mountView();
      await flushPromises();

      expect(wrapper.find('[role="status"]').exists()).toBe(false);
      wrapper.unmount();
    });
  });

  describe("error state", () => {
    it("shows an error alert when getBlogPosts rejects", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockRejectedValue(new Error("network"));

      const { wrapper } = await mountView();
      await flushPromises();

      expect(wrapper.find('[role="alert"]').exists()).toBe(true);
      expect(wrapper.find('[role="list"]').exists()).toBe(false);
      wrapper.unmount();
    });

    it("does not show the error alert on a successful fetch", async () => {
      const { wrapper } = await mountView();
      await flushPromises();

      expect(wrapper.find('[role="alert"]').exists()).toBe(false);
      wrapper.unmount();
    });
  });

  describe("empty state", () => {
    it("shows the empty message when there are no posts", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue([]);

      const { wrapper } = await mountView();
      await flushPromises();

      expect(wrapper.find('[role="list"]').exists()).toBe(false);
      expect(wrapper.text()).toContain(i18n.global.t("blogPostsPage.empty"));
      wrapper.unmount();
    });
  });

  describe("happy path", () => {
    it("renders the page heading", async () => {
      const { wrapper } = await mountView();
      await flushPromises();

      expect(wrapper.find("h1").text()).toBe(i18n.global.t("blogPostsPage.heading"));
      wrapper.unmount();
    });

    it("renders a list item for each post", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue(makePosts(3));

      const { wrapper } = await mountView();
      await flushPromises();

      expect(wrapper.findAll('[role="list"] li')).toHaveLength(3);
      wrapper.unmount();
    });

    it("renders each post title in the active locale", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue([
        makePost({ title: { nl: "Nederlandse titel", en: "English title" } }),
      ]);

      const { wrapper } = await mountView();
      await flushPromises();

      expect(wrapper.text()).toContain("Nederlandse titel");
      expect(wrapper.text()).not.toContain("English title");
      wrapper.unmount();
    });

    it("renders each post title in the correct locale when mounted with a different lang", async () => {
      i18n.global.locale.value = "en";
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue([
        makePost({ title: { nl: "Nederlandse titel", en: "English title" } }),
      ]);

      const { wrapper } = await mountView("/en/blog");
      await flushPromises();

      expect(wrapper.text()).toContain("English title");
      wrapper.unmount();
    });

    it("each post links to the correct detail route", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue([
        makePost({ id: 42 }),
      ]);

      const { wrapper } = await mountView();
      await flushPromises();

      const links = wrapper.findAll("a").filter((a) =>
        /\/nl\/blog\/post\/42/.test(a.attributes("href") ?? ""),
      );
      expect(links.length).toBeGreaterThanOrEqual(1);
      wrapper.unmount();
    });

    it("renders navbar and footer", async () => {
      const { wrapper } = await mountView();
      await flushPromises();

      expect(wrapper.find("nav").exists()).toBe(true);
      expect(wrapper.find("footer").exists()).toBe(true);
      wrapper.unmount();
    });
  });

  describe("sorting", () => {
    it("renders posts in descending publication date order", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue([
        makePost({ id: 1, title: { nl: "Oude post" }, published_at: new Date("2022-01-01") }),
        makePost({ id: 2, title: { nl: "Nieuwe post" }, published_at: new Date("2024-06-01") }),
        makePost({ id: 3, title: { nl: "Middelste post" }, published_at: new Date("2023-03-15") }),
      ]);

      const { wrapper } = await mountView();
      await flushPromises();

      const titles = wrapper.findAll("h2").map((h) => h.text());
      expect(titles).toEqual(["Nieuwe post", "Middelste post", "Oude post"]);
      wrapper.unmount();
    });

    it("renders posts without a publication date last", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue([
        makePost({ id: 1, title: { nl: "Geen datum" }, published_at: undefined }),
        makePost({ id: 2, title: { nl: "Met datum" }, published_at: new Date("2024-01-01") }),
      ]);

      const { wrapper } = await mountView();
      await flushPromises();

      const titles = wrapper.findAll("h2").map((h) => h.text());
      expect(titles).toEqual(["Met datum", "Geen datum"]);
      wrapper.unmount();
    });
  });

  describe("pagination", () => {
    const PAGE_SIZE = 10;

    it("does not render pagination controls when there are 6 posts or fewer", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue(makePosts(PAGE_SIZE));

      const { wrapper } = await mountView();
      await flushPromises();

      expect(wrapper.find("nav[aria-label]").exists()).toBe(false);
      wrapper.unmount();
    });

    it("renders pagination controls when there are more than 6 posts", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue(makePosts(PAGE_SIZE + 1));

      const { wrapper } = await mountView();
      await flushPromises();

      expect(wrapper.find("nav[aria-label]").exists()).toBe(true);
      wrapper.unmount();
    });

    it("shows only the first page of posts on initial load", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue(makePosts(PAGE_SIZE + 1));

      const { wrapper } = await mountView();
      await flushPromises();

      expect(wrapper.findAll('[role="list"] li')).toHaveLength(PAGE_SIZE);
      wrapper.unmount();
    });

    it("navigates to the next page when the next button is clicked", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue(makePosts(PAGE_SIZE + 1));

      const { wrapper } = await mountView();
      await flushPromises();

      const buttons = wrapper.findAll("button");
      const nextBtn = buttons.find((b) => b.text().toLowerCase().includes("volgende") || b.text().includes("→"));
      expect(nextBtn).toBeDefined();
      await nextBtn!.trigger("click");
      await flushPromises();

      expect(wrapper.findAll('[role="list"] li')).toHaveLength(1);
      wrapper.unmount();
    });

    it("disables the previous button on the first page", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue(makePosts(PAGE_SIZE + 1));

      const { wrapper } = await mountView();
      await flushPromises();

      const buttons = wrapper.findAll("button");
      const prevBtn = buttons.find((b) => b.text().toLowerCase().includes("vorige") || b.text().includes("←"));
      expect(prevBtn!.element.disabled).toBe(true);
      wrapper.unmount();
    });

    it("disables the next button on the last page", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue(makePosts(PAGE_SIZE + 1));

      const { wrapper } = await mountView("/nl/blog?page=2");
      await flushPromises();

      const buttons = wrapper.findAll("button");
      const nextBtn = buttons.find((b) => b.text().toLowerCase().includes("volgende") || b.text().includes("→"));
      expect(nextBtn!.element.disabled).toBe(true);
      wrapper.unmount();
    });

    it("reads the initial page from the ?page= query param", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue(makePosts(PAGE_SIZE + 2));

      const { wrapper } = await mountView("/nl/blog?page=2");
      await flushPromises();

      expect(wrapper.findAll('[role="list"] li')).toHaveLength(2);
      wrapper.unmount();
    });

    it("treats an invalid ?page= value as page 1", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue(makePosts(PAGE_SIZE + 1));

      const { wrapper } = await mountView("/nl/blog?page=abc");
      await flushPromises();

      expect(wrapper.findAll('[role="list"] li')).toHaveLength(PAGE_SIZE);
      wrapper.unmount();
    });

    it("clamps an out-of-range page to the last available page", async () => {
      vi.spyOn(blogpostsService, "getBlogPosts").mockResolvedValue(makePosts(PAGE_SIZE + 1));

      const { wrapper } = await mountView("/nl/blog?page=999");
      await flushPromises();

      expect(wrapper.findAll('[role="list"] li')).toHaveLength(1);
      wrapper.unmount();
    });
  });

  describe("dark mode", () => {
    it("applies the dark class when the localStorage preference is set", async () => {
      localStorage.setItem("viernulvier-dark", "true");
      resetDarkMode();

      const { wrapper } = await mountView();
      await flushPromises();

      expect(document.documentElement.classList.contains("dark")).toBe(true);
      wrapper.unmount();
    });
  });
});
