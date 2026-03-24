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
      bgClass: "bg-violet-950",
      accentClass: "text-violet-300",
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
    // The label is in a span with accentClass — just verify it renders text
    const spans = wrapper.findAll("span").filter((s) => !s.classes().includes("material-symbols-outlined"));
    const labelSpan = spans.find((s) => s.classes().some((c) => c.startsWith("text-")));
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

  it("applies the bgClass to the root element", () => {
    const wrapper = mountCard({ bgClass: "bg-amber-950" });
    expect(wrapper.classes()).toContain("bg-amber-950");
  });

  it("applies the accentClass to the label span", () => {
    const wrapper = mountCard({ accentClass: "text-amber-300" });
    // The icon and label both use accentClass
    const accentEls = wrapper
      .findAll("span")
      .filter((s) => s.classes().includes("text-amber-300"));
    expect(accentEls.length).toBeGreaterThanOrEqual(1);
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
      bgClass: "bg-amber-950",
      accentClass: "text-amber-300",
    });
    // "Film" is the same in nl/en/fr
    expect(wrapper.text()).toContain("Film");
    expect(wrapper.find("h3").text().length).toBeGreaterThan(0);
  });
});
