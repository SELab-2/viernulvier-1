import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import type { TagType } from "@viernulvier/shared";
import { i18n } from "@/i18n";
import TagTypeCellEditor from "@/components/admin/cms/tags/TagTypeCellEditor.vue";
import type { LanguageMap } from "@/utils/language-utils";

const tagTypes: TagType[] = [
  { id: 1, old_id: null, name: { en: "Genre" } } as TagType,
  { id: 2, old_id: null, name: { en: "Age" } } as TagType,
];

const localize = (map: LanguageMap | null | undefined): string =>
  map ? (map.en ?? "") : "";

function mountEditor(
  overrides: Partial<{
    value: number | null;
    data: { id: number; tagTypeId: number | null };
    stopEditing: ReturnType<typeof vi.fn>;
    onCreateRequest: ReturnType<typeof vi.fn>;
  }> = {},
) {
  const stopEditing = overrides.stopEditing ?? vi.fn();
  const onCreateRequest = overrides.onCreateRequest ?? vi.fn();
  const params = {
    value: overrides.value ?? null,
    data: overrides.data ?? { id: 10, tagTypeId: null },
    tagTypes,
    localize,
    stopEditing,
    onCreateRequest,
  };
  const wrapper = mount(TagTypeCellEditor, {
    global: { plugins: [i18n] },
    props: { params: params as unknown as InstanceType<typeof TagTypeCellEditor>["$props"]["params"] },
  });
  return { wrapper, stopEditing, onCreateRequest };
}

describe("TagTypeCellEditor", () => {
  it("renders the wrapped picker with autoFocus", () => {
    const { wrapper } = mountEditor();
    expect(wrapper.find('[data-testid="tag-type-cell-editor-picker"]').exists()).toBe(true);
  });

  it("getValue() returns the initial params.value", () => {
    const { wrapper } = mountEditor({ value: 2 });
    const exposed = wrapper.vm as { getValue: () => number | null };
    expect(exposed.getValue()).toBe(2);
  });

  it("falls back to data.tagTypeId when params.value is null", () => {
    const { wrapper } = mountEditor({ value: null, data: { id: 10, tagTypeId: 1 } });
    const exposed = wrapper.vm as { getValue: () => number | null };
    expect(exposed.getValue()).toBe(1);
  });

  it("selecting a type updates getValue and calls stopEditing(false)", async () => {
    const { wrapper, stopEditing } = mountEditor();
    await wrapper.get("input").trigger("focus");
    await wrapper.get('[data-testid="tag-type-picker-item-1"]').trigger("click");
    const exposed = wrapper.vm as { getValue: () => number | null };
    expect(exposed.getValue()).toBe(1);
    expect(stopEditing).toHaveBeenCalledWith();
  });

  it("create-request stops editing with cancel=true and triggers onCreateRequest", async () => {
    const { wrapper, stopEditing, onCreateRequest } = mountEditor({
      data: { id: 99, tagTypeId: null },
    });
    await wrapper.get("input").trigger("focus");
    await wrapper.get("input").setValue("Workshop");
    await wrapper.get('[data-testid="tag-type-picker-create"]').trigger("click");
    expect(stopEditing).toHaveBeenCalledWith(true);
    expect(onCreateRequest).toHaveBeenCalledWith({ rowId: 99, initialName: "Workshop" });
  });

  it("exposes isCancelBeforeStart/isCancelAfterEnd as no-ops returning false", () => {
    const { wrapper } = mountEditor();
    const exposed = wrapper.vm as {
      isCancelBeforeStart: () => boolean;
      isCancelAfterEnd: () => boolean;
    };
    expect(exposed.isCancelBeforeStart()).toBe(false);
    expect(exposed.isCancelAfterEnd()).toBe(false);
  });
});
