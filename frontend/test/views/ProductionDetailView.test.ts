import { describe, it, expect, beforeEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import ProductionDetailView from "@/views/ProductionDetailView.vue";

let wrapper: VueWrapper;
let router: Router;

async function createTestRouter(id: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  });

  await router.push(`/nl/productions/${id}`);
  await router.isReady();

  return router;
}

describe("ProductionDetailView.vue", () => {
  beforeEach(async () => {
    router = await createTestRouter("42");

    wrapper = mount(ProductionDetailView, {
      global: {
        plugins: [router, i18n],
      },
    });
  });

  it("renders without crashing", () => {
    expect(wrapper.exists()).toBe(true);
  });

  it("renders navbar and footer", () => {
    expect(wrapper.find("nav").exists()).toBe(true);
    expect(wrapper.find("footer").exists()).toBe(true);
  });

  it("renders all main sections", () => {
    expect(wrapper.findAll("section").length).toBeGreaterThanOrEqual(5);
  });
});