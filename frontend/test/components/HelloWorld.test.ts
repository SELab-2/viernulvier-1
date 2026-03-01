import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";
import App from "@/App.vue";

describe("Rendering", () => {
  test("renders the welcome message", () => {
    // Mount the component
    const wrapper = mount(App);

    // Check if specific text exists in the HTML
    expect(wrapper.text()).toContain("Vite + Vue");
  });
});

describe("Buttons", () => {
  test("increments count when button is clicked", async () => {
    const wrapper = mount(App);

    // Find the button and click it
    const button = wrapper.find("button");
    await button.trigger("click");

    expect(button.text()).toContain("count is 1");
  });
});
