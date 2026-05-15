import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { i18n, SUPPORTED_LANGS } from "@/i18n";
import CmsEditorPanel from "@/components/admin/cms/CmsEditorPanel.vue";
import type { EditorPanelState } from "@/services/cms";

vi.mock("easymde", () => {
  return {
    default: class MockEasyMDE {
      private _value = "";

      constructor(opts: any) {
        this._value = opts?.initialValue ?? "";
      }

      value(v?: string) {
        if (typeof v === "string") {
          this._value = v;
          return;
        }
        return this._value;
      }

      toTextArea() {}

      codemirror = {
        on: (_event: string, _cb: Function) => {},
      };
    },
  };
});

function makePanel(overrides: Partial<EditorPanelState> = {}): EditorPanelState {
  return {
    rowId: 42,
    apiField: "description",
    label: "Description",
    values: { nl: "NL text", en: "EN text", fr: "FR text" },
    ...overrides,
  };
}

function mountPanel(props: {
  panel: EditorPanelState | null;
  bulkCount?: number;
  saveError?: string | null;
  isSaving?: boolean;
}) {
  return mount(CmsEditorPanel, {
    props: {
      bulkCount: 0,
      saveError: null,
      isSaving: false,
      ...props,
    },
    global: { plugins: [i18n] },
  });
}

describe("CmsEditorPanel", () => {
  // ─── Visibility ────────────────────────────────────────────────────────────

  it("renders nothing when panel is null", () => {
    const wrapper = mountPanel({ panel: null });
    expect(wrapper.find(".cms-side-panel").exists()).toBe(false);
  });

  it("renders the aside when panel is set", () => {
    const wrapper = mountPanel({ panel: makePanel() });
    expect(wrapper.find(".cms-side-panel").exists()).toBe(true);
  });

  it("displays the panel label in the header", () => {
    const wrapper = mountPanel({ panel: makePanel({ label: "My Field" }) });
    expect(wrapper.find(".cms-side-header h2").text()).toBe("My Field");
  });

  // ─── Language textareas ─────────────────────────────────────────────────────

  it("renders one textarea per supported language", () => {
    const wrapper = mountPanel({ panel: makePanel() });
    const textareas = wrapper.findAll("textarea");
    expect(textareas).toHaveLength(SUPPORTED_LANGS.length);
  });

  it("pre-fills each textarea with the matching language value", () => {
    const panel = makePanel({ values: { nl: "Dutch", en: "English", fr: "French" } });
    const wrapper = mountPanel({ panel });
    expect(wrapper.props("panel")!.values.nl).toBe("Dutch");
    expect(wrapper.props("panel")!.values.en).toBe("English");
    expect(wrapper.props("panel")!.values.fr).toBe("French");
  });

  it("shows language labels in upper case", () => {
    const wrapper = mountPanel({ panel: makePanel() });
    const labels = wrapper.findAll(".cms-side-field span").map((s) => s.text());
    expect(labels).toContain("NL");
    expect(labels).toContain("EN");
    expect(labels).toContain("FR");
  });

  // ─── Bulk notice ────────────────────────────────────────────────────────────

  it("does not show the bulk notice when bulkCount is 1", () => {
    const wrapper = mountPanel({ panel: makePanel(), bulkCount: 1 });
    expect(wrapper.find(".cms-side-body p").exists()).toBe(false);
  });

  it("shows the bulk notice when bulkCount is greater than 1", () => {
    const wrapper = mountPanel({ panel: makePanel(), bulkCount: 3 });
    const notice = wrapper.find(".cms-side-body p");
    expect(notice.exists()).toBe(true);
    expect(notice.text()).toMatch(/3/);
  });

  // ─── Save error ─────────────────────────────────────────────────────────────

  it("does not show a save error when saveError is null", () => {
    const wrapper = mountPanel({ panel: makePanel(), saveError: null });
    expect(wrapper.find(".text-red-700").exists()).toBe(false);
  });

  it("displays the save error message", () => {
    const wrapper = mountPanel({ panel: makePanel(), saveError: "Something went wrong" });
    expect(wrapper.find(".text-red-700").text()).toBe("Something went wrong");
  });

  // ─── Save button state ──────────────────────────────────────────────────────

  it("enables the save button when not saving", () => {
    const wrapper = mountPanel({ panel: makePanel(), isSaving: false });
    const btn = wrapper.find(".cms-side-save");
    expect((btn.element as HTMLButtonElement).disabled).toBe(false);
  });

  it("disables the save button and shows saving label while isSaving is true", () => {
    const wrapper = mountPanel({ panel: makePanel(), isSaving: true });

    const { t } = i18n.global;

    const btn = wrapper.find(".cms-side-save");
    expect((btn.element as HTMLButtonElement).disabled).toBe(true);
    expect(btn.text()).toMatch(t("general.saving"));
  });

  // ─── Emits ──────────────────────────────────────────────────────────────────

  it("emits close when the close button is clicked", async () => {
    const wrapper = mountPanel({ panel: makePanel() });
    await wrapper.find(".cms-side-close").trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("emits save when the save button is clicked", async () => {
    const wrapper = mountPanel({ panel: makePanel() });
    await wrapper.find(".cms-side-save").trigger("click");
    expect(wrapper.emitted("save")).toHaveLength(1);
  });

  // ─── update:panel — outward sync ────────────────────────────────────────────

  it("emits update:panel with updated values when the user edits a textarea", async () => {
    const panel = makePanel({ values: { nl: "Oud", en: "", fr: "" } });
    const wrapper = mountPanel({ panel });

    const editor = wrapper.findComponent({ name: "MarkdownEditor" });
    await editor.vm.$emit("update:modelValue", "Nieuw");

    await nextTick();

    const emitted = wrapper.emitted("update:panel");
    expect(emitted).toBeTruthy();

    const lastPayload: any = emitted![emitted!.length - 1][0];

    expect(lastPayload.values.nl).toBe("Nieuw");
    // other panel fields are preserved
    expect(lastPayload.rowId).toBe(panel.rowId);
    expect(lastPayload.apiField).toBe(panel.apiField);
    expect(lastPayload.label).toBe(panel.label);
  });

  // ─── update:panel — inward sync ─────────────────────────────────────────────

  it("resets local values when the panel prop is replaced with a new panel", async () => {
    const wrapper = mountPanel({ panel: makePanel({ values: { nl: "Old NL", en: "", fr: "" } }) });

    await wrapper.setProps({
      panel: makePanel({ rowId: 99, values: { nl: "New NL", en: "New EN", fr: "" } }),
    });
    await nextTick();

    expect(wrapper.props("panel")!.values.nl).toBe("New NL");
    expect(wrapper.props("panel")!.values.en).toBe("New EN");
  });

  it("clears textareas when the panel prop is set to null after being open", async () => {
    const wrapper = mountPanel({ panel: makePanel() });
    expect(wrapper.find(".cms-side-panel").exists()).toBe(true);

    await wrapper.setProps({ panel: null });
    await nextTick();

    expect(wrapper.find(".cms-side-panel").exists()).toBe(false);
  });

  it("does not emit update:panel while the panel is null", async () => {
    const wrapper = mountPanel({ panel: null });
    // Trigger the outward watcher path with no panel present
    await wrapper.setProps({ panel: null });
    await nextTick();
    expect(wrapper.emitted("update:panel")).toBeFalsy();
  });
});