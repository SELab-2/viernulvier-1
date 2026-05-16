import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import ProductionsLayoutToggle from "@/components/productions/ProductionsLayoutToggle.vue";

function mountToggle(modelValue: "list" | "grid", disabled = false) {
  return mount(ProductionsLayoutToggle, {
    props: { modelValue, disabled },
    global: { plugins: [i18n] },
  });
}

describe("ProductionsLayoutToggle.vue", () => {
  it("marks the active button via aria-pressed", () => {
    const wrapper = mountToggle("list");
    const buttons = wrapper.findAll("button");
    expect(buttons[0]!.attributes("aria-pressed")).toBe("true");
    expect(buttons[1]!.attributes("aria-pressed")).toBe("false");
  });

  it("emits update:modelValue with the picked mode", async () => {
    const wrapper = mountToggle("list");
    await wrapper.findAll("button")[1]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["grid"]);
  });

  it("emits the opposite mode when the list button is clicked from grid state", async () => {
    const wrapper = mountToggle("grid");
    await wrapper.findAll("button")[0]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["list"]);
  });

  it("does not emit when clicking the already-active button is disabled", async () => {
    const wrapper = mountToggle("grid", true);
    const buttons = wrapper.findAll("button");
    expect(buttons[0]!.attributes("disabled")).toBeDefined();
    expect(buttons[1]!.attributes("disabled")).toBeDefined();
  });
});
