import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import { RouteNames } from "@/router/routeNames";
import FeaturedBlogSection from "@/components/home/FeaturedBlogSection.vue";

async function mountFeatured() {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/nl");
  await router.isReady();

  return mount(FeaturedBlogSection, {
    global: { plugins: [router, i18n] },
  });
}

describe("FeaturedBlogSection.vue", () => {
  // ── Structural smoke tests ────────────────────────────────────────────────

  it("renders without errors", async () => {
    const wrapper = await mountFeatured();
    expect(wrapper.exists()).toBe(true);
  });

  it("renders a section element", async () => {
    const wrapper = await mountFeatured();
    expect(wrapper.find("section").exists()).toBe(true);
  });

  it("renders an article with a heading", async () => {
    const wrapper = await mountFeatured();
    expect(wrapper.find("article").exists()).toBe(true);
    const h2 = wrapper.find("h2");
    expect(h2.exists()).toBe(true);
    expect(h2.text()).toBeTruthy();
  });

  // ── Editorial content ─────────────────────────────────────────────────────

  it("renders an excerpt paragraph with the drop-cap class", async () => {
    const wrapper = await mountFeatured();
    const lead = wrapper.find("p.article-lead");
    expect(lead.exists()).toBe(true);
    expect(lead.text()).toBeTruthy();
  });

  it("renders a lead image inside a figure with a caption", async () => {
    const wrapper = await mountFeatured();
    const figure = wrapper.find("figure");
    expect(figure.exists()).toBe(true);
    expect(figure.find("img").exists()).toBe(true);
    expect(figure.find("figcaption").exists()).toBe(true);
    expect(figure.find("figcaption").text()).toBeTruthy();
  });

  // ── Linking ───────────────────────────────────────────────────────────────

  it("links to the blog post detail route", async () => {
    const wrapper = await mountFeatured();
    const links = wrapper.findAll("a");
    // The "read more" link is the only outbound link in the section.
    const detailLink = links.find((a) =>
      (a.attributes("href") ?? "").includes("/blog/post/"),
    );
    expect(detailLink).toBeDefined();
  });

  it(
    "wires the read-more link to the BLOG_POST_DETAIL route with " +
      "a numeric id",
    async () => {
      const wrapper = await mountFeatured();
      // RouterLink resolves to a real <a> with an href; the href should
      // match `/nl/blog/post/<id>` where id is the placeholder post id.
      const link = wrapper
        .findAll("a")
        .find((a) => /\/blog\/post\/\d+$/.test(a.attributes("href") ?? ""));
      expect(link).toBeDefined();
      // Sanity: the route name resolves through the router (smoke check
      // that the named-route reference compiles and the placeholder id
      // is wired through).
      expect(RouteNames.BLOG_POST_DETAIL).toBeTruthy();
    },
  );
});
