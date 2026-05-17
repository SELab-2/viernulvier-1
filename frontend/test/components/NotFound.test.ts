import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import NotFound from "@/components/NotFound.vue";


async function mountComponent(props = {}) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/nl");
  await router.isReady();

  const wrapper = mount(NotFound, {
    props,
    global: { plugins: [router, i18n] },
  });

  return { wrapper, router };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("NotFound.vue", () => {
  let wrapper: Awaited<ReturnType<typeof mountComponent>>["wrapper"];

  afterEach(() => {
    wrapper?.unmount();
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  describe("rendering", () => {
    beforeEach(async () => {
      ({ wrapper } = await mountComponent());
    });

    it("renders without errors", () => {
      expect(wrapper.exists()).toBe(true);
    });

    it("renders a main heading", () => {
      expect(wrapper.find("h1").exists()).toBe(true);
    });

    it("renders a description paragraph", () => {
      expect(wrapper.find("p").exists()).toBe(true);
    });

    it("renders a router-link button", () => {
      const link = wrapper.find("a");
      expect(link.exists()).toBe(true);
    });

    it("renders contact mail link", () => {
      const mail = wrapper.find("a[href^='mailto:']");
      expect(mail.exists()).toBe(true);
    });
  });

  // ── Props vs i18n ────────────────────────────────────────────────────────

  describe("props override", () => {
    it("uses provided title instead of translation", async () => {
      ({ wrapper } = await mountComponent({
        title: "Custom title",
      }));

      expect(wrapper.text()).toContain("Custom title");
    });

    it("uses provided description", async () => {
      ({ wrapper } = await mountComponent({
        description: "Custom description",
      }));

      expect(wrapper.text()).toContain("Custom description");
    });

    it("uses provided button label", async () => {
      ({ wrapper } = await mountComponent({
        buttonLabel: "Click me",
      }));

      expect(wrapper.text()).toContain("Click me");
    });
  });

  // ── Routing ──────────────────────────────────────────────────────────────

  describe("routing", () => {
    it("defaults to the root link", async () => {
      ({ wrapper } = await mountComponent());

      const link = wrapper.find("a");
      expect(link.attributes("href")).toBe("/");
    });

    it("uses custom buttonLink when provided", async () => {
      ({ wrapper } = await mountComponent({
        buttonLink: "/custom",
      }));

      const link = wrapper.find("a");
      expect(link.attributes("href")).toBe("/custom");
    });
  });
});
