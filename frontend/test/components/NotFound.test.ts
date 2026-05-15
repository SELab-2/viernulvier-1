import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import NotFound from "@/components/NotFound.vue";

const defaultProps = {
  title: "Page not found",
  description: "This page does not exist.",
  buttonLabel: "Back to productions",
};

async function mountComponent(props: Record<string, unknown> = {}) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/nl");
  await router.isReady();

  const wrapper = mount(NotFound, {
    props: { ...defaultProps, ...props },
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
  });

  // ── Props ────────────────────────────────────────────────────────────────

  describe("props", () => {
    it("renders the title prop", async () => {
      ({ wrapper } = await mountComponent({ title: "Custom title" }));

      expect(wrapper.text()).toContain("Custom title");
    });

    it("renders the description prop", async () => {
      ({ wrapper } = await mountComponent({ description: "Custom description" }));

      expect(wrapper.text()).toContain("Custom description");
    });

    it("renders the button label prop", async () => {
      ({ wrapper } = await mountComponent({ buttonLabel: "Click me" }));

      expect(wrapper.text()).toContain("Click me");
    });
  });

  // ── Routing ──────────────────────────────────────────────────────────────

  describe("routing", () => {
    it("defaults to /productions link", async () => {
      ({ wrapper } = await mountComponent());

      const link = wrapper.find("a");
      expect(link.attributes("href")).toBe("/productions");
    });

    it("uses custom buttonLink when provided", async () => {
      ({ wrapper } = await mountComponent({ buttonLink: "/custom" }));

      const link = wrapper.find("a");
      expect(link.attributes("href")).toBe("/custom");
    });
  });
});
