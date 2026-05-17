import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import { RouteNames } from "@/router/routeNames";
import HeroSection from "@/components/home/HeroSection.vue";

async function mountHero() {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/nl");
  await router.isReady();

  const wrapper = mount(HeroSection, {
    global: { plugins: [router, i18n] },
  });

  return { wrapper, router };
}

describe("HeroSection.vue", () => {
  // ── Structural smoke tests ────────────────────────────────────────────────

  it("renders without errors", async () => {
    const { wrapper } = await mountHero();
    expect(wrapper.exists()).toBe(true);
  });

  it("renders a section element", async () => {
    const { wrapper } = await mountHero();
    expect(wrapper.find("section").exists()).toBe(true);
  });

  it("renders an h1 headline with non-empty text", async () => {
    const { wrapper } = await mountHero();
    const h1 = wrapper.find("h1");
    expect(h1.exists()).toBe(true);
    expect(h1.text()).toBeTruthy();
  });

  it("renders the lead paragraph with non-empty text", async () => {
    const { wrapper } = await mountHero();
    // Lead paragraph carries the drop-cap and the archive intro copy.
    const lead = wrapper.find("p.hero-lead");
    expect(lead.exists()).toBe(true);
    expect(lead.text()).toBeTruthy();
  });

  it("renders the atmospheric hero image as decorative", async () => {
    const { wrapper } = await mountHero();
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    // The image is a textured ground (DESIGN.md §8), not content —
    // it must be marked decorative so screen readers skip it.
    expect(img.attributes("alt")).toBe("");
    expect(img.attributes("aria-hidden")).toBe("true");
  });

  // ── Search form ───────────────────────────────────────────────────────────

  it("renders a search form with an input and a submit button", async () => {
    const { wrapper } = await mountHero();
    expect(wrapper.find('form[role="search"]').exists()).toBe(true);
    expect(wrapper.find('input[type="search"]').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it(
    "submitting with a query navigates to /productions with " +
      "the search deeplink",
    async () => {
      const { wrapper, router } = await mountHero();
      const input = wrapper.find('input[type="search"]');
      await input.setValue("hamlet");
      await wrapper.find("form").trigger("submit");
      // The component fires router.push without awaiting it, and
      // ProductionsView is lazy-loaded — flushing microtasks once
      // isn't always enough. Retry until the route resolves.
      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe(
          RouteNames.PRODUCTIONS,
        );
      });
      expect(router.currentRoute.value.query.search).toBe("hamlet");
    },
  );

  it(
    "submitting an empty query navigates to /productions without " +
      "a search param",
    async () => {
      const { wrapper, router } = await mountHero();
      await wrapper.find("form").trigger("submit");
      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe(
          RouteNames.PRODUCTIONS,
        );
      });
      expect(router.currentRoute.value.query.search).toBeUndefined();
    },
  );

  it("trims whitespace from the search query before navigating", async () => {
    const { wrapper, router } = await mountHero();
    const input = wrapper.find('input[type="search"]');
    await input.setValue("   ");
    await wrapper.find("form").trigger("submit");
    await vi.waitFor(() => {
      expect(router.currentRoute.value.name).toBe(RouteNames.PRODUCTIONS);
    });
    // Whitespace-only collapses to no search filter at all.
    expect(router.currentRoute.value.query.search).toBeUndefined();
  });

  // ── Browse-all RouterLink ─────────────────────────────────────────────────

  it("renders a 'browse all productions' link to the productions page", async () => {
    const { wrapper } = await mountHero();
    const links = wrapper.findAll("a");
    const productionsLink = links.find((a) =>
      (a.attributes("href") ?? "").includes("productions"),
    );
    expect(productionsLink).toBeDefined();
  });
});
