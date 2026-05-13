import { describe, expect, test, afterEach, beforeAll } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { i18n } from "@/i18n";
import ProductionsDateFilter from "@/components/productions/ProductionsDateFilter.vue";

describe("ProductionsDateFilter.vue", () => {
  beforeAll(() => {
    if (typeof HTMLElement.prototype.setPointerCapture !== "function") {
      Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
        value: function () {},
        configurable: true,
      });
      Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
        value: function () {},
        configurable: true,
      });
    }
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  function mountFilter(props: {
    minYear: number;
    maxYear: number;
    yearRange: { from: number; to: number } | null;
    dateFrom: string | null;
    dateTo: string | null;
    disabled?: boolean;
  }) {
    return mount(ProductionsDateFilter, {
      props: {
        disabled: false,
        ...props,
      },
      attachTo: document.body,
      global: { plugins: [i18n] },
    });
  }

  test("mutual exclusivity: both dates set clears year range", async () => {
    const wrapper = mountFilter({
      minYear: 2000,
      maxYear: 2030,
      yearRange: { from: 2010, to: 2020 },
      dateFrom: null,
      dateTo: null,
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
    const wrapper = mountFilter({
      minYear: 2000,
      maxYear: 2030,
      yearRange: null,
      dateFrom: "2025-01-01",
      dateTo: "2025-06-01",
    });
    await wrapper.setProps({ yearRange: { from: 2010, to: 2020 } });
    await nextTick();
    expect(wrapper.emitted("update:dateFrom")?.at(-1)?.[0]).toBeNull();
    expect(wrapper.emitted("update:dateTo")?.at(-1)?.[0]).toBeNull();
    wrapper.unmount();
  });

  test("opens the panel on button click and closes on outside click", async () => {
    const wrapper = mountFilter({
      minYear: 2000,
      maxYear: 2030,
      yearRange: null,
      dateFrom: null,
      dateTo: null,
    });
    await wrapper.find("button").trigger("click");
    await nextTick();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);

    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    wrapper.unmount();
  });

  test("applies active accent styling when a year range or date range is active", async () => {
    const w1 = mountFilter({
      minYear: 2000,
      maxYear: 2030,
      yearRange: { from: 2015, to: 2020 },
      dateFrom: null,
      dateTo: null,
    });
    expect(
      w1
        .find("button")
        .classes()
        .some((c) => c.includes("border-accent-outline")),
    ).toBe(true);
    w1.unmount();

    const w2 = mountFilter({
      minYear: 2000,
      maxYear: 2030,
      yearRange: null,
      dateFrom: "2025-01-01",
      dateTo: "2025-02-01",
    });
    expect(
      w2
        .find("button")
        .classes()
        .some((c) => c.includes("border-accent-outline")),
    ).toBe(true);
    w2.unmount();
  });

  test("range sliders commit a non-default year span", async () => {
    const wrapper = mountFilter({
      minYear: 2000,
      maxYear: 2030,
      yearRange: null,
      dateFrom: null,
      dateTo: null,
    });
    await wrapper.find("button").trigger("click");
    await nextTick();

    const low = wrapper.find(".year-range-thumb-low");
    const high = wrapper.find(".year-range-thumb-high");
    await low.setValue("2010");
    await low.trigger("input");
    await low.trigger("change");
    await high.setValue("2015");
    await high.trigger("input");
    await high.trigger("change");

    const last = wrapper.emitted("update:yearRange")?.at(-1)?.[0] as {
      from: number;
      to: number;
    } | null;
    expect(last).toEqual({ from: 2010, to: 2015 });
    wrapper.unmount();
  });

  test("date inputs reorder when from is after to", async () => {
    const wrapper = mountFilter({
      minYear: 2000,
      maxYear: 2030,
      yearRange: null,
      dateFrom: "2025-06-01",
      dateTo: "2025-01-01",
    });
    await wrapper.find("button").trigger("click");
    await nextTick();

    const inputs = wrapper.findAll('input[type="date"]');
    await inputs[0]!.trigger("change");
    await nextTick();

    const from = wrapper.emitted("update:dateFrom")?.at(-1)?.[0];
    const to = wrapper.emitted("update:dateTo")?.at(-1)?.[0];
    expect(from).toBe("2025-01-01");
    expect(to).toBe("2025-06-01");
    wrapper.unmount();
  });

  test("clear dates button clears both date fields", async () => {
    const wrapper = mountFilter({
      minYear: 2000,
      maxYear: 2030,
      yearRange: null,
      dateFrom: "2025-01-01",
      dateTo: "2025-06-01",
    });
    await wrapper.find("button").trigger("click");
    await nextTick();

    const clearBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Datums") || b.text().includes("Clear"));
    expect(clearBtn).toBeDefined();
    await clearBtn!.trigger("click");
    await nextTick();

    expect(wrapper.emitted("update:dateFrom")?.at(-1)?.[0]).toBeNull();
    expect(wrapper.emitted("update:dateTo")?.at(-1)?.[0]).toBeNull();
    wrapper.unmount();
  });

  test("disabled prop disables the toggle and panel controls", async () => {
    const wrapper = mountFilter({
      minYear: 2000,
      maxYear: 2030,
      yearRange: null,
      dateFrom: null,
      dateTo: null,
      disabled: true,
    });
    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
    await wrapper.find("button").trigger("click");
    await nextTick();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    wrapper.unmount();
  });

  test("single calendar year (minYear === maxYear) keeps sliders disabled", async () => {
    const wrapper = mountFilter({
      minYear: 2020,
      maxYear: 2020,
      yearRange: null,
      dateFrom: null,
      dateTo: null,
    });
    await wrapper.find("button").trigger("click");
    await nextTick();
    expect(wrapper.find(".year-range-thumb-low").attributes("disabled")).toBeDefined();
    wrapper.unmount();
  });

  test("collapsed overlay pointer drag updates thumbs when both coincide", async () => {
    const wrapper = mountFilter({
      minYear: 2000,
      maxYear: 2030,
      yearRange: null,
      dateFrom: null,
      dateTo: null,
    });
    await wrapper.find("button").trigger("click");
    await nextTick();

    const low = wrapper.find(".year-range-thumb-low");
    const high = wrapper.find(".year-range-thumb-high");
    await low.setValue("2015");
    await low.trigger("input");
    await high.setValue("2015");
    await high.trigger("input");
    await nextTick();

    const overlay = wrapper.find(".cursor-grab");
    const el = overlay.element;
    el.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: 100,
        pointerId: 1,
        button: 0,
      }),
    );
    el.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: 200,
        pointerId: 1,
      }),
    );
    el.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 1 }),
    );
    await nextTick();

    wrapper.unmount();
  });

  test("lostpointercapture ends collapsed drag and commits", async () => {
    const wrapper = mountFilter({
      minYear: 2000,
      maxYear: 2030,
      yearRange: null,
      dateFrom: null,
      dateTo: null,
    });
    await wrapper.find("button").trigger("click");
    await nextTick();

    const low = wrapper.find(".year-range-thumb-low");
    const high = wrapper.find(".year-range-thumb-high");
    await low.setValue("2018");
    await low.trigger("input");
    await high.setValue("2018");
    await high.trigger("input");
    await nextTick();

    const overlay = wrapper.find(".cursor-grab");
    const el = overlay.element;
    el.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: 100,
        pointerId: 2,
        button: 0,
      }),
    );
    el.dispatchEvent(
      new PointerEvent("lostpointercapture", { bubbles: true, pointerId: 2 }),
    );
    await nextTick();

    wrapper.unmount();
  });
});
