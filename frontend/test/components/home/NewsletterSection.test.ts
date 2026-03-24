import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import NewsletterSection from "@/components/home/NewsletterSection.vue";

function mountNewsletter() {
  return mount(NewsletterSection, {
    global: { plugins: [i18n] },
  });
}

describe("NewsletterSection.vue", () => {
  it("renders without errors", () => {
    const wrapper = mountNewsletter();
    expect(wrapper.exists()).toBe(true);
  });

  it("renders a section element", () => {
    const wrapper = mountNewsletter();
    expect(wrapper.find("section").exists()).toBe(true);
  });

  it("renders the section heading", () => {
    const wrapper = mountNewsletter();
    expect(wrapper.find("h2").exists()).toBe(true);
    expect(wrapper.find("h2").text()).toBeTruthy();
  });

  it("renders the subtitle paragraph", () => {
    const wrapper = mountNewsletter();
    expect(wrapper.find("p").exists()).toBe(true);
    expect(wrapper.find("p").text()).toBeTruthy();
  });

  it("renders an email input", () => {
    const wrapper = mountNewsletter();
    const input = wrapper.find("input[type='email']");
    expect(input.exists()).toBe(true);
  });

  it("renders a submit button", () => {
    const wrapper = mountNewsletter();
    const btn = wrapper.find("button[type='submit']");
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toBeTruthy();
  });

  it("renders a form element", () => {
    const wrapper = mountNewsletter();
    expect(wrapper.find("form").exists()).toBe(true);
  });

  it("binds the email model to the input", async () => {
    const wrapper = mountNewsletter();
    const input = wrapper.find("input[type='email']");
    await input.setValue("test@example.com");
    expect((input.element as HTMLInputElement).value).toBe("test@example.com");
  });

  it("clears the email field on submit", async () => {
    const wrapper = mountNewsletter();
    const input = wrapper.find("input[type='email']");
    await input.setValue("test@example.com");
    await wrapper.find("form").trigger("submit.prevent");
    expect((input.element as HTMLInputElement).value).toBe("");
  });

  it("the input has a placeholder", () => {
    const wrapper = mountNewsletter();
    const input = wrapper.find("input[type='email']");
    expect(input.attributes("placeholder")).toBeTruthy();
  });

  it("the input is marked as required", () => {
    const wrapper = mountNewsletter();
    const input = wrapper.find("input[type='email']");
    expect(input.attributes("required")).toBeDefined();
  });
});
