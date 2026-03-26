import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import BentoCard from "@/components/home/BentoCard.vue";

function mountCard(overrides: Partial<InstanceType<typeof BentoCard>["$props"]> = {}) {
  return mount(BentoCard, {
    props: {
      labelKey: "bento.music.label",
      titleKey: "bento.music.title",
      descriptionKey: "bento.music.description",
      icon: "music_note",
      ...overrides,
    },
    global: { plugins: [i18n] },
  });
}

describe("BentoCard.vue", () => {
  it("renders without errors", () => {
    const wrapper = mountCard();
    expect(wrapper.exists()).toBe(true);
  });

  it("renders the translated label (non-empty)", () => {
    const wrapper = mountCard();
    const spans = wrapper.findAll("span").filter((s) => !s.classes().includes("material-symbols-outlined"));
    const labelSpan = spans.find((s) => s.text().length > 0);
    expect(labelSpan?.text().length).toBeGreaterThan(0);
  });

  it("renders the translated title (non-empty)", () => {
    const wrapper = mountCard();
    expect(wrapper.find("h3").text().length).toBeGreaterThan(0);
  });

  it("renders the translated description (non-empty)", () => {
    const wrapper = mountCard();
    expect(wrapper.find("p").text().length).toBeGreaterThan(0);
  });

  it("renders the icon via Material Symbols", () => {
    const wrapper = mountCard();
    const icon = wrapper.find(".material-symbols-outlined");
    expect(icon.exists()).toBe(true);
    expect(icon.text()).toBe("music_note");
  });

  it("applies design-token background class to root element", () => {
    const wrapper = mountCard();
    expect(wrapper.classes()).toContain("bg-surface-2");
  });

  it("renders a different icon when prop changes", () => {
    const wrapper = mountCard({ icon: "movie" });
    expect(wrapper.find(".material-symbols-outlined").text()).toBe("movie");
  });

  it("renders film card content correctly", () => {
    const wrapper = mountCard({
      labelKey: "bento.film.label",
      titleKey: "bento.film.title",
      descriptionKey: "bento.film.description",
      icon: "movie",
    });
    // "Film" is the same in nl/en/fr
    expect(wrapper.text()).toContain("Film");
    expect(wrapper.find("h3").text().length).toBeGreaterThan(0);
  });
});
