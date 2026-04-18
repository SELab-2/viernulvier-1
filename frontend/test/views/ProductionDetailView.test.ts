import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "@/router/routes";
import ProductionDetailView from "@/views/ProductionDetailView.vue";

async function createTestRouter(id: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(`/nl/productions/${id}`);
  await router.isReady();
  return router;
}

describe("ProductionDetailView.vue", () => {
  it("renders without errors", async () => {
    const router = await createTestRouter("42");
    const wrapper = mount(ProductionDetailView, {
      global: { plugins: [router] },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it("renders the production id from the route param", async () => {
    const router = await createTestRouter("42");
    const wrapper = mount(ProductionDetailView, {
      global: { plugins: [router] },
    });
    expect(wrapper.text()).toContain("42");
  });
});
