import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import MarkdownEditor from "@/components/MarkdownEditor.vue";

// ─── SimpleMDE mock ───────────────────────────────────────────────────────────
//
// SimpleMDE manipulates the real DOM and uses CodeMirror internally — it cannot
// run in jsdom. We replace the entire module with a lightweight fake that
// exposes only the surface area the component uses:
//   • constructor options (initialValue, placeholder)
//   • codemirror.on("change", cb) — lets tests fire the change callback
//   • value(newVal?) — getter / setter
//   • toTextArea()   — called on unmount

interface MockSimpleMDEOptions {
  element?: HTMLTextAreaElement;
  initialValue?: string;
  placeholder?: string;
  spellChecker?: boolean;
}

let lastOptions: MockSimpleMDEOptions = {};
let changeCallback: (() => void) | null = null;
let currentValue = "";
const mockToTextArea = vi.fn();

vi.mock("easymde", () => ({
  default: vi.fn().mockImplementation(function (options: MockSimpleMDEOptions) {
    lastOptions = options;
    currentValue = options.initialValue ?? "";
    changeCallback = null;

    return {
      codemirror: {
        on(event: string, cb: () => void) {
          if (event === "change") changeCallback = cb;
        },
      },
      value(newVal?: string) {
        if (newVal !== undefined) currentValue = newVal;
        return currentValue;
      },
      toTextArea: mockToTextArea,
    };
  }),
}));

vi.mock("easymde/dist/easymde.min.css", () => ({}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MarkdownEditor.vue", () => {
  beforeEach(() => {
    lastOptions = {};
    changeCallback = null;
    currentValue = "";
    mockToTextArea.mockClear();
  });

  // ── Rendering ───────────────────────────────────────────────────────────────

  describe("rendering", () => {
    it("renders the markdown-editor wrapper", () => {
      const wrapper = mount(MarkdownEditor, { props: { modelValue: "" } });
      expect(wrapper.find(".markdown-editor").exists()).toBe(true);
    });

    it("renders a textarea element", () => {
      const wrapper = mount(MarkdownEditor, { props: { modelValue: "" } });
      expect(wrapper.find("textarea").exists()).toBe(true);
    });
  });

  // ── Initialisation ──────────────────────────────────────────────────────────

  describe("initialisation", () => {
    it("passes modelValue as initialValue to SimpleMDE", () => {
      mount(MarkdownEditor, { props: { modelValue: "Hello world" } });
      expect(lastOptions.initialValue).toBe("Hello world");
    });

    it("passes placeholder prop to SimpleMDE", () => {
      mount(MarkdownEditor, { props: { modelValue: "", placeholder: "Type here…" } });
      expect(lastOptions.placeholder).toBe("Type here…");
    });

    it("disables the spell checker", () => {
      mount(MarkdownEditor, { props: { modelValue: "" } });
      expect(lastOptions.spellChecker).toBe(false);
    });
  });

  // ── v-model ─────────────────────────────────────────────────────────────────

  describe("v-model / update:modelValue", () => {
    it("emits update:modelValue when the editor content changes", async () => {
      const wrapper = mount(MarkdownEditor, { props: { modelValue: "" } });

      currentValue = "new content";
      changeCallback?.();
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
      expect(wrapper.emitted("update:modelValue")![0]).toEqual(["new content"]);
    });

    it("emits the current editor value on each change", async () => {
      const wrapper = mount(MarkdownEditor, { props: { modelValue: "" } });

      currentValue = "first";
      changeCallback?.();
      currentValue = "second";
      changeCallback?.();
      await wrapper.vm.$nextTick();

      const emissions = wrapper.emitted("update:modelValue")!;
      expect(emissions[0]).toEqual(["first"]);
      expect(emissions[1]).toEqual(["second"]);
    });
  });

  // ── Prop watcher ────────────────────────────────────────────────────────────

  describe("watcher on modelValue prop", () => {
    it("updates the editor when modelValue changes externally", async () => {
      const wrapper = mount(MarkdownEditor, { props: { modelValue: "original" } });

      await wrapper.setProps({ modelValue: "updated externally" });

      expect(currentValue).toBe("updated externally");
    });

    it("does not update the editor when the new value equals the current value", async () => {
      const wrapper = mount(MarkdownEditor, { props: { modelValue: "same" } });

      // Set to the same value — editor.value(newVal) must NOT be called with a new value
      await wrapper.setProps({ modelValue: "same" });

      // currentValue should be unchanged
      expect(currentValue).toBe("same");
    });
  });

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  describe("cleanup on unmount", () => {
    it("calls toTextArea when the component is unmounted", () => {
      const wrapper = mount(MarkdownEditor, { props: { modelValue: "" } });
      wrapper.unmount();
      expect(mockToTextArea).toHaveBeenCalledOnce();
    });
  });
});
