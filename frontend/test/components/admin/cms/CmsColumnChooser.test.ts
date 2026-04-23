import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import CmsColumnChooser from "@/components/admin/cms/CmsColumnChooser.vue";

describe("CmsColumnChooser", () => {
  function mountChooser(show = true) {
    return mount(CmsColumnChooser, {
      props: {
        show,
        columnOptions: [
          { colId: "title", label: "Title" },
          { colId: "tags", label: "Tags" },
        ],
        columnVisibility: {
          title: true,
          tags: false,
        },
      },
    });
  }

  it("does not render when hidden", () => {
    const wrapper = mountChooser(false);
    expect(wrapper.find(".cms-column-popup-overlay").exists()).toBe(false);
  });

  it("renders options and reflects checkbox visibility", () => {
    const wrapper = mountChooser(true);
    const inputs = wrapper.findAll('input[type="checkbox"]');
    expect(inputs).toHaveLength(2);
    expect((inputs[0]?.element as HTMLInputElement).checked).toBe(true);
    expect((inputs[1]?.element as HTMLInputElement).checked).toBe(false);
  });

  it("emits close on overlay self click and close button", async () => {
    const wrapper = mountChooser(true);
    await wrapper.get(".cms-column-popup-overlay").trigger("click");
    await wrapper.get(".cms-mini-btn").trigger("click");
    expect(wrapper.emitted("close")?.length).toBe(2);
  });

  it("emits set-column-visibility when checkbox toggles", async () => {
    const wrapper = mountChooser(true);
    const inputs = wrapper.findAll('input[type="checkbox"]');

    await inputs[0]?.setValue(false);
    await inputs[1]?.setValue(true);

    expect(wrapper.emitted("set-column-visibility")?.[0]).toEqual(["title", false]);
    expect(wrapper.emitted("set-column-visibility")?.[1]).toEqual(["tags", true]);
  });
});
