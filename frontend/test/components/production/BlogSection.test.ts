import { describe, it, expect, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import { i18n as appI18n } from "@/i18n";
import { createMemoryHistory, createRouter } from "vue-router";
import type { BlogPostWithBackwardsRefs } from "@viernulvier/shared";
import { routes } from "@/router/routes";
import BlogSection from "@/components/production/BlogSection.vue";


const i18n = createI18n({
  legacy: false,
  locale: "nl",
  messages: {
    nl: {
      production: {
        blog: {
          title: "Van de blog",
          body: "Lees meer over deze productie",
          readMore: "Lees meer",
        },
      },
    },
    fr: {
      production: {
        blog: {
          title: "Du blog",
          body: "En savoir plus",
          readMore: "Lire la suite",
        },
      },
    },
  },
});


const makePost = (
  id: number,
  overrides: Partial<BlogPostWithBackwardsRefs> = {},
): BlogPostWithBackwardsRefs =>
  ({
    id,
    title: { nl: `Blogpost ${id}`, fr: `Article ${id}` },
    content: { nl: `Inhoud van post ${id}`, fr: `Contenu de article ${id}` },
    published_at: new Date("2024-06-15T00:00:00.000Z"),
    tagline: {},
    ...overrides,
  }) as BlogPostWithBackwardsRefs;


async function mountSection(props: {
  blogPosts?: BlogPostWithBackwardsRefs[];
  loading?: boolean;
}) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/nl/productions/1");
  await router.isReady();

  return mount(BlogSection, {
    props: {
      blogPosts: props.blogPosts ?? [],
      loading: props.loading ?? false,
    },
    global: { plugins: [router, i18n] },
  });
}


describe("BlogSection", () => {
  afterEach(() => {
    i18n.global.locale.value = "nl";
    appI18n.global.locale.value = "nl";
    vi.restoreAllMocks();
  });

  describe("visibility", () => {
    it("renders nothing when not loading and no posts", async () => {
      const wrapper = await mountSection({ blogPosts: [], loading: false });
      expect(wrapper.find("section").exists()).toBe(false);
      wrapper.unmount();
    });

    it("renders the section while loading even when posts are empty", async () => {
      const wrapper = await mountSection({ blogPosts: [], loading: true });
      expect(wrapper.find("section").exists()).toBe(true);
      wrapper.unmount();
    });

    it("renders the section when posts are present and not loading", async () => {
      const wrapper = await mountSection({ blogPosts: [makePost(1)], loading: false });
      expect(wrapper.find("section").exists()).toBe(true);
      wrapper.unmount();
    });
  });

  describe("loading skeleton", () => {
    it("shows the skeleton status element while loading", async () => {
      const wrapper = await mountSection({ loading: true });
      expect(wrapper.find('[role="status"]').exists()).toBe(true);
      wrapper.unmount();
    });

    it("renders three skeleton cards while loading", async () => {
      const wrapper = await mountSection({ loading: true });
      const skeletonCards = wrapper.find('[role="status"]').findAll(".animate-pulse");
      expect(skeletonCards).toHaveLength(3);
      wrapper.unmount();
    });

    it("hides the skeleton once loading is false", async () => {
      const wrapper = await mountSection({ blogPosts: [makePost(1)], loading: false });
      expect(wrapper.find('[role="status"]').exists()).toBe(false);
      wrapper.unmount();
    });

    it("does not render post cards while loading", async () => {
      const wrapper = await mountSection({ blogPosts: [makePost(1)], loading: true });
      expect(wrapper.findAll("a.group")).toHaveLength(0);
      wrapper.unmount();
    });
  });

  describe("header", () => {
    it("renders the section heading from i18n", async () => {
      const wrapper = await mountSection({ blogPosts: [makePost(1)] });
      expect(wrapper.find("h2").text()).toBe("Van de blog");
      wrapper.unmount();
    });

    it("renders the section subtext from i18n", async () => {
      const wrapper = await mountSection({ blogPosts: [makePost(1)] });
      expect(wrapper.find("p").text()).toBe("Lees meer over deze productie");
      wrapper.unmount();
    });
  });

  describe("post cards", () => {
    it("renders one card per post", async () => {
      const wrapper = await mountSection({ blogPosts: [makePost(1), makePost(2), makePost(3)] });
      expect(wrapper.findAll("a.group")).toHaveLength(3);
      wrapper.unmount();
    });

    it("renders the post title in an h3", async () => {
      const wrapper = await mountSection({ blogPosts: [makePost(1)] });
      expect(wrapper.find("h3").text()).toBe("Blogpost 1");
      wrapper.unmount();
    });

    it("renders the 'read more' label from i18n", async () => {
      const wrapper = await mountSection({ blogPosts: [makePost(1)] });
      expect(wrapper.text()).toContain("Lees meer");
      wrapper.unmount();
    });

    it("renders a RouterLink with the post id in the href", async () => {
      const wrapper = await mountSection({ blogPosts: [makePost(42)] });
      const link = wrapper.find("a.group");
      expect(link.attributes("href")).toContain("42");
      wrapper.unmount();
    });

    it("renders the formatted publication date", async () => {
      const wrapper = await mountSection({
        blogPosts: [makePost(1, { published_at: new Date("2024-06-15T00:00:00.000Z") })],
      });

      expect(wrapper.text()).toContain("2024");
      wrapper.unmount();
    });

    it("renders no date when published_at is absent", async () => {
      const wrapper = await mountSection({
        blogPosts: [makePost(1, { published_at: undefined })],
      });

      expect(wrapper.find("h3").text()).toBe("Blogpost 1");
      wrapper.unmount();
    });

    it("renders the content preview via v-html", async () => {
      const wrapper = await mountSection({
        blogPosts: [makePost(1, { content: { nl: "**Vette inhoud**" } })],
      });

      expect(wrapper.find(".prose-flat").html()).toContain("<strong>");
      wrapper.unmount();
    });

    it("clamps long content to three lines via line-clamp-3", async () => {
      const wrapper = await mountSection({ blogPosts: [makePost(1)] });
      expect(wrapper.find(".line-clamp-3").exists()).toBe(true);
      wrapper.unmount();
    });
  });

  describe("locale", () => {
    it("uses the active locale to display the post title", async () => {
      i18n.global.locale.value = "fr";
      appI18n.global.locale.value = "fr";
      const wrapper = await mountSection({ blogPosts: [makePost(1)] });
      expect(wrapper.find("h3").text()).toBe("Article 1");
      wrapper.unmount();
    });

    it("uses the active locale for the content preview", async () => {
      i18n.global.locale.value = "fr";
      appI18n.global.locale.value = "fr";
      const wrapper = await mountSection({ blogPosts: [makePost(1)] });
      expect(wrapper.find(".prose-flat").text()).toContain("Contenu de article 1");
      wrapper.unmount();
    });

    it("falls back gracefully when the locale has no translation for a post title", async () => {
      i18n.global.locale.value = "fr";
      appI18n.global.locale.value = "fr";
      const wrapper = await mountSection({
        blogPosts: [makePost(1, { title: { nl: "Alleen Nederlands" }, content: { nl: "" } })],
      });

      expect(wrapper.find("h3").exists()).toBe(true);
      wrapper.unmount();
    });

    it("falls back to another language when the active locale has an empty string value", async () => {
      i18n.global.locale.value = "fr";
      appI18n.global.locale.value = "fr";
      const wrapper = await mountSection({
        blogPosts: [makePost(1, { title: { nl: "Alleen Nederlands", fr: "" } })],
      });

      expect(wrapper.find("h3").text()).toBe("Alleen Nederlands");
      wrapper.unmount();
    });
  });
});
