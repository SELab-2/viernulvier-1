import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import ProductionsSortControl from "@/components/productions/ProductionsSortControl.vue";

describe("ProductionsSortControl.vue", () => {
  it("opens menu and emits sortChange when selecting a different metric", async () => {
    const wrapper = mount(ProductionsSortControl, {
      props: { sortBy: "date", sortDir: "desc" },
      global: { plugins: [i18n] },
      attachTo: document.body,
    });

    await wrapper.find("#productions-sort-dimension").trigger("click");
    expect(wrapper.find('[data-sort-metric="name"]').exists()).toBe(true);

    await wrapper.find('[data-sort-metric="name"]').trigger("click");
    expect(wrapper.emitted("sortChange")).toEqual([
      [{ sortBy: "name", sortDir: "desc" }],
    ]);

    wrapper.unmount();
  });

  it("does not emit when selecting the already active metric", async () => {
    const wrapper = mount(ProductionsSortControl, {
      props: { sortBy: "date", sortDir: "desc" },
      global: { plugins: [i18n] },
      attachTo: document.body,
    });

    await wrapper.find("#productions-sort-dimension").trigger("click");
    await wrapper.find('[data-sort-metric="date"]').trigger("click");
    expect(wrapper.emitted("sortChange")).toBeUndefined();

    wrapper.unmount();
  });

  it("toggles sort direction from asc to desc", async () => {
    const wrapper = mount(ProductionsSortControl, {
      props: { sortBy: "name", sortDir: "asc" },
      global: { plugins: [i18n] },
    });

    await wrapper.find("#productions-sort-direction").trigger("click");
    expect(wrapper.emitted("sortChange")).toEqual([
      [{ sortBy: "name", sortDir: "desc" }],
    ]);

    wrapper.unmount();
  });

  it("toggles sort direction from desc to asc", async () => {
    const wrapper = mount(ProductionsSortControl, {
      props: { sortBy: "name", sortDir: "desc" },
      global: { plugins: [i18n] },
    });

    await wrapper.find("#productions-sort-direction").trigger("click");
    expect(wrapper.emitted("sortChange")).toEqual([
      [{ sortBy: "name", sortDir: "asc" }],
    ]);

    wrapper.unmount();
  });

  it("does not open menu or emit when disabled", async () => {
    const wrapper = mount(ProductionsSortControl, {
      props: { sortBy: "date", sortDir: "desc", disabled: true },
      global: { plugins: [i18n] },
      attachTo: document.body,
    });

    await wrapper.find("#productions-sort-dimension").trigger("click");
    const listbox = wrapper.find('ul[role="listbox"]');
    expect(listbox.isVisible()).toBe(false);

    await wrapper.find("#productions-sort-direction").trigger("click");
    expect(wrapper.emitted("sortChange")).toBeUndefined();

    wrapper.unmount();
  });

  it("closes the open menu on outside click", async () => {
    const wrapper = mount(ProductionsSortControl, {
      props: { sortBy: "date", sortDir: "desc" },
      global: { plugins: [i18n] },
      attachTo: document.body,
    });

    await wrapper.find("#productions-sort-dimension").trigger("click");
    const listbox = wrapper.find('ul[role="listbox"]');
    expect(listbox.isVisible()).toBe(true);

    document.body.click();
    await wrapper.vm.$nextTick();
    expect(listbox.isVisible()).toBe(false);

    wrapper.unmount();
  });
});
