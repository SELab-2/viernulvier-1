import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import BlogSection from "@/components/production/BlogSection.vue";

const i18n = createI18n({
  legacy: false,
  locale: "nl",
  messages: {
    nl: {
      production: {
        blog: {
          title: "Verwante artikelen",
          body: "Achtergrondverhalen en interviews bij deze productie.",
          all: "Alle artikelen",
        },
      },
    },
  },
});

function mountBlog() {
  return mount(BlogSection, {
    global: { plugins: [i18n] },
  });
}

describe("BlogSection", () => {
  it("renders without errors", () => {
    const wrapper = mountBlog();
    expect(wrapper.exists()).toBe(true);
  });

  it("renders the translated section heading", () => {
    const wrapper = mountBlog();
    expect(wrapper.find("h2").text()).toContain("Verwante artikelen");
  });

  it("renders all 3 blog cards", () => {
    const wrapper = mountBlog();
    expect(wrapper.findAll("img")).toHaveLength(3);
  });

  it("renders the translated all-articles link", () => {
    const wrapper = mountBlog();
    expect(wrapper.find("a").text()).toContain("Alle artikelen");
  });
});
