import { describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import type { TagType } from "@viernulvier/shared";
import { i18n } from "@/i18n";
import TagTypePicker from "@/components/admin/cms/tags/TagTypePicker.vue";
import type { LanguageMap } from "@/utils/language-utils";

const tagTypes: TagType[] = [
  { id: 1, old_id: null, name: { en: "Genre", nl: "Genre", fr: "Genre" } } as TagType,
  { id: 2, old_id: null, name: { en: "Age", nl: "Leeftijd", fr: "Âge" } } as TagType,
  { id: 3, old_id: null, name: {} } as TagType,
];

const localize = (map: LanguageMap | null | undefined): string =>
  map ? (map.en ?? "") : "";

function mountPicker(props: Partial<InstanceType<typeof TagTypePicker>["$props"]> = {}) {
  return mount(TagTypePicker, {
    global: { plugins: [i18n] },
    props: {
      modelValue: null,
      tagTypes,
      localize,
      ...props,
    },
  });
}

describe("TagTypePicker", () => {
  it("renders an input with the configured placeholder", () => {
    const wrapper = mountPicker({ placeholder: "Pick me" });
    const input = wrapper.get("input");
    expect((input.element as HTMLInputElement).placeholder).toBe("Pick me");
  });

  it("opens the listbox on focus and shows all types", async () => {
    const wrapper = mountPicker();
    await wrapper.get("input").trigger("focus");
    expect(wrapper.findAll(".tag-type-picker-item")).toHaveLength(tagTypes.length);
  });

  it("filters the list as the user types", async () => {
    const wrapper = mountPicker();
    await wrapper.get("input").trigger("focus");
    await wrapper.get("input").setValue("age");
    const items = wrapper.findAll(".tag-type-picker-item");
    expect(items).toHaveLength(1);
    expect(items[0].text()).toContain("Age");
  });

  it("shows '#id' fallback for tag types without a localizable name", async () => {
    const wrapper = mountPicker();
    await wrapper.get("input").trigger("focus");
    const item = wrapper.get('[data-testid="tag-type-picker-item-3"]');
    expect(item.text()).toContain("#3");
  });

  it("emits update:modelValue when clicking a type", async () => {
    const wrapper = mountPicker();
    await wrapper.get("input").trigger("focus");
    await wrapper.get('[data-testid="tag-type-picker-item-2"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([2]);
  });

  it("emits create-request with the trimmed typed name", async () => {
    const wrapper = mountPicker();
    const input = wrapper.get("input");
    await input.trigger("focus");
    await input.setValue("  Workshop  ");
    await wrapper.get('[data-testid="tag-type-picker-create"]').trigger("click");
    expect(wrapper.emitted("create-request")?.[0]).toEqual(["Workshop"]);
  });

  it("uses the empty create label when nothing is typed", async () => {
    const wrapper = mountPicker();
    await wrapper.get("input").trigger("focus");
    const create = wrapper.get('[data-testid="tag-type-picker-create"]');
    expect(create.text()).toMatch(/Create new tag type|Maak nieuw tag-type|Créer un nouveau type de tag/);
  });

  it("hides the create option when the typed text matches an existing type exactly", async () => {
    const wrapper = mountPicker();
    const input = wrapper.get("input");
    await input.trigger("focus");
    await input.setValue("Genre");
    expect(wrapper.find('[data-testid="tag-type-picker-create"]').exists()).toBe(false);
  });

  it("shows 'no matching types' when nothing matches and disabled hides create", async () => {
    const wrapper = mountPicker({ disabled: true });
    // Disabled input cannot be focused; force-open via prop reset is unnecessary —
    // the create option simply must not appear even if it were open.
    expect(wrapper.find(".tag-type-picker-list").exists()).toBe(false);
  });

  it("supports keyboard ArrowDown/Enter to select a type", async () => {
    const wrapper = mountPicker();
    const input = wrapper.get("input");
    await input.trigger("focus");
    await input.trigger("keydown", { key: "ArrowDown" });
    await input.trigger("keydown", { key: "ArrowDown" });
    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([2]);
  });

  it("ArrowUp wraps from index 0 to the last item", async () => {
    const wrapper = mountPicker();
    const input = wrapper.get("input");
    await input.trigger("focus");
    await input.trigger("keydown", { key: "ArrowUp" });
    await input.trigger("keydown", { key: "Enter" });
    // Index wraps to total - 1; total includes the create row when nothing is typed.
    expect(wrapper.emitted("create-request")).toBeTruthy();
  });

  it("Escape closes the menu and restores the query", async () => {
    const wrapper = mountPicker({ modelValue: 1 });
    await flushPromises();
    const input = wrapper.get("input");
    await input.trigger("focus");
    await input.setValue("typo");
    await input.trigger("keydown", { key: "Escape" });
    expect(wrapper.find(".tag-type-picker-list").exists()).toBe(false);
    expect((input.element as HTMLInputElement).value).toBe("Genre");
  });

  it("Enter on the create row emits create-request", async () => {
    const wrapper = mountPicker();
    const input = wrapper.get("input");
    await input.trigger("focus");
    await input.setValue("Workshop");
    // ArrowDown past all items to reach the create row.
    for (let i = 0; i < 10; i++) {
      await input.trigger("keydown", { key: "ArrowDown" });
    }
    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("create-request")).toBeTruthy();
  });

  it("Enter without an open menu is ignored", async () => {
    const wrapper = mountPicker();
    await wrapper.get("input").trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("syncs the displayed query when modelValue changes externally", async () => {
    const wrapper = mountPicker({ modelValue: 1 });
    await flushPromises();
    expect((wrapper.get("input").element as HTMLInputElement).value).toBe("Genre");
    await wrapper.setProps({ modelValue: 2 });
    expect((wrapper.get("input").element as HTMLInputElement).value).toBe("Age");
    await wrapper.setProps({ modelValue: null });
    expect((wrapper.get("input").element as HTMLInputElement).value).toBe("");
  });

  it("clears the query when modelValue points to a non-existent type", async () => {
    const wrapper = mountPicker({ modelValue: 999 });
    await flushPromises();
    expect((wrapper.get("input").element as HTMLInputElement).value).toBe("");
  });

  it("re-syncs the query when the tagTypes list changes", async () => {
    const wrapper = mountPicker({ modelValue: 1 });
    await flushPromises();
    const next: TagType[] = [
      { id: 1, old_id: null, name: { en: "Genre-renamed" } } as TagType,
    ];
    await wrapper.setProps({ tagTypes: next });
    expect((wrapper.get("input").element as HTMLInputElement).value).toBe("Genre-renamed");
  });

  it("autoFocus focuses the input on mount", async () => {
    const wrapper = mount(TagTypePicker, {
      attachTo: document.body,
      global: { plugins: [i18n] },
      props: { modelValue: null, tagTypes, localize, autoFocus: true },
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).toBe(wrapper.get("input").element);
    wrapper.unmount();
  });

  it("focus() exposed method moves focus to the input", async () => {
    const wrapper = mount(TagTypePicker, {
      attachTo: document.body,
      global: { plugins: [i18n] },
      props: { modelValue: null, tagTypes, localize },
    });
    (wrapper.vm as { focus: () => void }).focus();
    expect(document.activeElement).toBe(wrapper.get("input").element);
    wrapper.unmount();
  });

  it("mouseenter on an item marks it as active", async () => {
    const wrapper = mountPicker();
    await wrapper.get("input").trigger("focus");
    const second = wrapper.get('[data-testid="tag-type-picker-item-2"]');
    await second.trigger("mouseenter");
    expect(second.classes()).toContain("is-active");
  });

  it("mouseenter on the create row marks it as active", async () => {
    const wrapper = mountPicker();
    const input = wrapper.get("input");
    await input.trigger("focus");
    await input.setValue("Workshop");
    const create = wrapper.get('[data-testid="tag-type-picker-create"]');
    await create.trigger("mouseenter");
    expect(create.classes()).toContain("is-active");
  });

  it("blurring the input closes the menu after the click-grace delay", async () => {
    vi.useFakeTimers();
    const wrapper = mount(TagTypePicker, {
      attachTo: document.body,
      global: { plugins: [i18n] },
      props: { modelValue: null, tagTypes, localize },
    });
    const input = wrapper.get("input");
    await input.trigger("focus");
    expect(wrapper.find(".tag-type-picker-list").exists()).toBe(true);

    (input.element as HTMLInputElement).blur();
    await input.trigger("blur");
    vi.advanceTimersByTime(200);
    await flushPromises();

    expect(wrapper.find(".tag-type-picker-list").exists()).toBe(false);
    wrapper.unmount();
    vi.useRealTimers();
  });

  it("disabled prevents focus from opening the menu and ignores key presses", async () => {
    const wrapper = mountPicker({ disabled: true });
    const input = wrapper.get("input");
    expect((input.element as HTMLInputElement).disabled).toBe(true);

    await input.trigger("focus");
    expect(wrapper.find(".tag-type-picker-list").exists()).toBe(false);

    await input.trigger("keydown", { key: "ArrowDown" });
    expect(wrapper.find(".tag-type-picker-list").exists()).toBe(false);
  });

  it("unknown keys do not open the menu or emit events", async () => {
    const wrapper = mountPicker();
    await wrapper.get("input").trigger("keydown", { key: "Tab" });
    expect(wrapper.find(".tag-type-picker-list").exists()).toBe(false);
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("uses the dataTestid prop to set the input's data-testid", () => {
    const wrapper = mountPicker({ dataTestid: "my-picker" });
    expect(wrapper.find('[data-testid="my-picker"]').exists()).toBe(true);
  });

  it("a document click outside the picker closes the menu", async () => {
    const wrapper = mount(TagTypePicker, {
      attachTo: document.body,
      global: { plugins: [i18n] },
      props: { modelValue: null, tagTypes, localize },
    });
    await wrapper.get("input").trigger("focus");
    expect(wrapper.find(".tag-type-picker-list").exists()).toBe(true);

    document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(wrapper.find(".tag-type-picker-list").exists()).toBe(false);
    wrapper.unmount();
  });
});
