import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import BlogSection from "@/components/production/BlogSection.vue";

describe("BlogSection", () => {
  it("renders without errors", () => {
    const wrapper = mount(BlogSection);
    expect(wrapper.exists()).toBe(true);
  });

  it("renders the section heading", () => {
    const wrapper = mount(BlogSection);
    expect(wrapper.text()).toContain("Related Blogposts");
  });

  it("renders all 3 blog cards", () => {
    const wrapper = mount(BlogSection);
    expect(wrapper.findAll("img")).toHaveLength(3);
  });

  it("renders the All Blogposts link", () => {
    const wrapper = mount(BlogSection);
    expect(wrapper.find("a").text()).toContain("All Blogposts");
  });
});