import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import BentoGrid from "@/components/home/BentoGrid.vue";

async function mountGrid() {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/nl");
  await router.isReady();

  return mount(BentoGrid, {
    global: { plugins: [router, i18n] },
  });
}

describe("BentoGrid.vue", () => {
  it("renders without errors", async () => {
    const wrapper = await mountGrid();
    expect(wrapper.exists()).toBe(true);
  });

  it("renders a section element", async () => {
    const wrapper = await mountGrid();
    expect(wrapper.find("section").exists()).toBe(true);
  });

  it("renders the featured card heading", async () => {
    const wrapper = await mountGrid();
    expect(wrapper.find("h2").exists()).toBe(true);
    expect(wrapper.find("h2").text()).toBeTruthy();
  });

  it("renders the featured card CTA link", async () => {
    const wrapper = await mountGrid();
    const links = wrapper.findAll("a");
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the arrow_forward icon in the CTA", async () => {
    const wrapper = await mountGrid();
    const icons = wrapper
      .findAll(".material-symbols-outlined")
      .map((el) => el.text());
    expect(icons).toContain("arrow_forward");
  });

  it("renders the featured card background image", async () => {
    const wrapper = await mountGrid();
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
  });
});
