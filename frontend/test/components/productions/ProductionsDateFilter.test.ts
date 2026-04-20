import { describe, expect, test } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { i18n } from "@/i18n";
import ProductionsDateFilter from "@/components/productions/ProductionsDateFilter.vue";

describe("ProductionsDateFilter.vue", () => {
  test("mutual exclusivity: both dates set clears year range", async () => {
    const wrapper = mount(ProductionsDateFilter, {
      props: {
        minYear: 2000,
        maxYear: 2030,
        yearRange: { from: 2010, to: 2020 },
        dateFrom: null,
        dateTo: null,
      },
      global: { plugins: [i18n] },
    });
    await wrapper.setProps({
      dateFrom: "2025-01-01",
      dateTo: "2025-06-01",
    });
    await nextTick();
    expect(wrapper.emitted("update:yearRange")?.at(-1)?.[0]).toBeNull();
    wrapper.unmount();
  });

  test("mutual exclusivity: year range set clears both dates", async () => {
    const wrapper = mount(ProductionsDateFilter, {
      props: {
        minYear: 2000,
        maxYear: 2030,
        yearRange: null,
        dateFrom: "2025-01-01",
        dateTo: "2025-06-01",
      },
      global: { plugins: [i18n] },
    });
    await wrapper.setProps({ yearRange: { from: 2010, to: 2020 } });
    await nextTick();
    expect(wrapper.emitted("update:dateFrom")?.at(-1)?.[0]).toBeNull();
    expect(wrapper.emitted("update:dateTo")?.at(-1)?.[0]).toBeNull();
    wrapper.unmount();
  });
});
