import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import HeroSection from "@/components/home/HeroSection.vue";

async function mountHero() {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/nl");
  await router.isReady();

  return mount(HeroSection, {
    global: { plugins: [router, i18n] },
  });
}

describe("HeroSection.vue", () => {
  it("renders without errors", async () => {
    const wrapper = await mountHero();
    expect(wrapper.exists()).toBe(true);
  });

  it("renders an h1 headline", async () => {
    const wrapper = await mountHero();
    expect(wrapper.find("h1").exists()).toBe(true);
  });

  it("renders the hero title text", async () => {
    const wrapper = await mountHero();
    expect(wrapper.find("h1").text()).toBeTruthy();
  });

  it("renders a subtitle paragraph", async () => {
    const wrapper = await mountHero();
    expect(wrapper.find("p").exists()).toBe(true);
    expect(wrapper.find("p").text()).toBeTruthy();
  });

  it("renders a CTA link to the productions page", async () => {
    const wrapper = await mountHero();
    const cta = wrapper.find("a");
    expect(cta.exists()).toBe(true);
    expect(cta.attributes("href")).toContain("productions");
  });

  it("renders the hero image", async () => {
    const wrapper = await mountHero();
    expect(wrapper.find("img").exists()).toBe(true);
  });

  it("renders the image alt attribute", async () => {
    const wrapper = await mountHero();
    const img = wrapper.find("img");
    expect(img.attributes("alt")).toBeTruthy();
  });

  it("renders a section element", async () => {
    const wrapper = await mountHero();
    expect(wrapper.find("section").exists()).toBe(true);
  });

  it("renders the arrow icon SVG inside the CTA", async () => {
    const wrapper = await mountHero();
    const svg = wrapper.find("a svg");
    expect(svg.exists()).toBe(true);
  });
});
