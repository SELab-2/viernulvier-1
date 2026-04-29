import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import CmsTabShell from "@/components/admin/cms/CmsTabShell.vue";

const baseProps = {
  rowCount: 0,
  loadedCountKey: "cms.actions.loadedCount",
  emptyStateKey: "cms.actions.noRows",
  isLoading: false,
  loadError: null as string | null,
  saveError: null as string | null,
  quickFilterText: "",
  selectedCount: 0,
  columnChooserOpen: false,
  columnOptions: [
    { colId: "name", label: "Name" },
    { colId: "type", label: "Type" },
  ] as const,
  columnVisibility: { name: true, type: true } as Record<string, boolean>,
};

const CmsGridControlsStub = {
  template: `
    <div data-testid="grid-controls">
      <button data-testid="emit-update-filter" @click="$emit('update:quick-filter-text', 'needle')" />
      <button data-testid="emit-apply" @click="$emit('apply-quick-filter')" />
      <button data-testid="emit-fit" @click="$emit('fit-columns')" />
      <button data-testid="emit-auto" @click="$emit('auto-size-columns')" />
      <button data-testid="emit-reset-filters" @click="$emit('reset-filters')" />
      <button data-testid="emit-export" @click="$emit('export-csv')" />
      <button data-testid="emit-reset-state" @click="$emit('reset-state')" />
      <button data-testid="emit-toggle" @click="$emit('toggle-columns')" />
    </div>
  `,
  emits: [
    "update:quick-filter-text",
    "apply-quick-filter",
    "fit-columns",
    "auto-size-columns",
    "reset-filters",
    "export-csv",
    "reset-state",
    "toggle-columns",
  ],
};

const CmsColumnChooserStub = {
  template: `
    <div data-testid="column-chooser" :data-show="String(show)">
      <button data-testid="chooser-close" @click="$emit('close')" />
      <button data-testid="chooser-set" @click="$emit('set-column-visibility', 'name', false)" />
    </div>
  `,
  props: ["show", "columnOptions", "columnVisibility"],
  emits: ["close", "set-column-visibility"],
};

function mountShell(propsOverride: Partial<typeof baseProps> = {}, slots: Record<string, string> = {}) {
  return mount(CmsTabShell, {
    props: { ...baseProps, ...propsOverride },
    slots,
    global: {
      plugins: [i18n],
      stubs: {
        CmsGridControls: CmsGridControlsStub,
        CmsColumnChooser: CmsColumnChooserStub,
      },
    },
  });
}

describe("CmsTabShell", () => {
  describe("layout", () => {
    it("renders the header-actions slot in the toolbar row", () => {
      const wrapper = mountShell({}, {
        "header-actions": "<button data-testid='custom-add'>add</button>",
      });

      expect(wrapper.find('[data-testid="custom-add"]').exists()).toBe(true);
    });

    it("renders the row count via the supplied i18n key", () => {
      const wrapper = mountShell({ rowCount: 7, loadedCountKey: "cms.actions.loadedCount" });

      expect(wrapper.text()).toContain("7");
    });

    it("renders status-banner slot between load error and grid", () => {
      const wrapper = mountShell({}, {
        "status-banner": "<div data-testid='status'>hi</div>",
      });

      expect(wrapper.find('[data-testid="status"]').exists()).toBe(true);
    });

    it("renders modals slot at the end", () => {
      const wrapper = mountShell({}, {
        modals: "<div data-testid='extra-modal'>m</div>",
      });

      expect(wrapper.find('[data-testid="extra-modal"]').exists()).toBe(true);
    });
  });

  describe("error and empty states", () => {
    it("hides the grid slot and shows the load error banner when loadError is set", () => {
      const wrapper = mountShell({ loadError: "Network down" }, {
        grid: "<div data-testid='grid-slot'>grid</div>",
      });

      expect(wrapper.text()).toContain("Network down");
      expect(wrapper.find(".cms-grid-shell").exists()).toBe(false);
      expect(wrapper.find('[data-testid="grid-slot"]').exists()).toBe(false);
    });

    it("renders the grid slot when there is no load error", () => {
      const wrapper = mountShell({}, {
        grid: "<div data-testid='grid-slot'>grid</div>",
      });

      expect(wrapper.find(".cms-grid-shell").exists()).toBe(true);
      expect(wrapper.find('[data-testid="grid-slot"]').exists()).toBe(true);
    });

    it("shows the save error banner when saveError is set", () => {
      const wrapper = mountShell({ saveError: "Could not save" });

      expect(wrapper.text()).toContain("Could not save");
    });

    it("shows the empty-state placeholder when rowCount is zero and not loading", () => {
      const wrapper = mountShell({ rowCount: 0, emptyStateKey: "cms.actions.noRows" });

      expect(wrapper.text()).toMatch(/geen|no/i);
    });

    it("hides the empty-state while loading", () => {
      const wrapper = mountShell({ rowCount: 0, isLoading: true, emptyStateKey: "cms.actions.noRows" });

      expect(wrapper.text()).not.toMatch(/geen rijen|no rows/i);
    });

    it("hides the empty-state when there are rows", () => {
      const wrapper = mountShell({ rowCount: 5, emptyStateKey: "cms.actions.noRows" });

      expect(wrapper.text()).not.toMatch(/geen rijen|no rows/i);
    });

    it("hides the empty-state when there is a load error", () => {
      const wrapper = mountShell({ rowCount: 0, loadError: "boom", emptyStateKey: "cms.actions.noRows" });

      expect(wrapper.text()).not.toMatch(/geen rijen|no rows/i);
    });
  });

  describe("grid controls forwarding", () => {
    it("forwards quick-filter updates as v-model:quickFilterText", async () => {
      const wrapper = mountShell();

      await wrapper.find('[data-testid="emit-update-filter"]').trigger("click");

      expect(wrapper.emitted("update:quickFilterText")?.[0]).toEqual(["needle"]);
    });

    it("forwards each grid control event 1:1", async () => {
      const wrapper = mountShell();

      await wrapper.find('[data-testid="emit-apply"]').trigger("click");
      await wrapper.find('[data-testid="emit-fit"]').trigger("click");
      await wrapper.find('[data-testid="emit-auto"]').trigger("click");
      await wrapper.find('[data-testid="emit-reset-filters"]').trigger("click");
      await wrapper.find('[data-testid="emit-export"]').trigger("click");
      await wrapper.find('[data-testid="emit-reset-state"]').trigger("click");

      expect(wrapper.emitted("apply-quick-filter")).toHaveLength(1);
      expect(wrapper.emitted("fit-columns")).toHaveLength(1);
      expect(wrapper.emitted("auto-size-columns")).toHaveLength(1);
      expect(wrapper.emitted("reset-filters")).toHaveLength(1);
      expect(wrapper.emitted("export-csv")).toHaveLength(1);
      expect(wrapper.emitted("reset-state")).toHaveLength(1);
    });

    it("toggles columnChooserOpen via the controls", async () => {
      const wrapperClosed = mountShell({ columnChooserOpen: false });
      await wrapperClosed.find('[data-testid="emit-toggle"]').trigger("click");
      expect(wrapperClosed.emitted("update:columnChooserOpen")?.[0]).toEqual([true]);

      const wrapperOpen = mountShell({ columnChooserOpen: true });
      await wrapperOpen.find('[data-testid="emit-toggle"]').trigger("click");
      expect(wrapperOpen.emitted("update:columnChooserOpen")?.[0]).toEqual([false]);
    });
  });

  describe("column chooser", () => {
    it("hides the column chooser while loadError is set", () => {
      const wrapper = mountShell({ columnChooserOpen: true, loadError: "x" });

      expect(wrapper.find('[data-testid="column-chooser"]').attributes("data-show")).toBe("false");
    });

    it("shows the column chooser when open and no error", () => {
      const wrapper = mountShell({ columnChooserOpen: true });

      expect(wrapper.find('[data-testid="column-chooser"]').attributes("data-show")).toBe("true");
    });

    it("forwards close to update:columnChooserOpen=false", async () => {
      const wrapper = mountShell({ columnChooserOpen: true });

      await wrapper.find('[data-testid="chooser-close"]').trigger("click");

      expect(wrapper.emitted("update:columnChooserOpen")?.[0]).toEqual([false]);
    });

    it("forwards set-column-visibility with colId and visible flag", async () => {
      const wrapper = mountShell();

      await wrapper.find('[data-testid="chooser-set"]').trigger("click");

      expect(wrapper.emitted("set-column-visibility")?.[0]).toEqual(["name", false]);
    });
  });
});
