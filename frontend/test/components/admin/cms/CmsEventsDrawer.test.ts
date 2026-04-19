import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import type { Hall } from "@viernulvier/shared";
import { i18n } from "@/i18n";
import type { CmsEventGridRow, CmsProductionGridRow } from "@/services/cms";
import CmsEventsDrawer from "@/components/admin/cms/productions/CmsEventsDrawer.vue";

function buildProduction(overrides: Partial<CmsProductionGridRow> = {}): CmsProductionGridRow {
  return {
    id: 1,
    source: {} as never,
    performer: "Performer",
    title: "Title",
    producer: "",
    teaser: "",
    genres: "",
    tags: "",
    descriptionOne: "",
    descriptionTwo: "",
    media: "",
    events: [],
    ...overrides,
  };
}

function buildEventRow(overrides: Partial<CmsEventGridRow> = {}): CmsEventGridRow {
  return {
    id: 100,
    date: "13/04/2026",
    time: "10:00",
    location: "Hall",
    price: "N/A",
    startsAt: "2026-04-13T10:00",
    endsAt: "2026-04-13T12:00",
    doorsAt: "2026-04-13T09:30",
    hallId: 1,
    infoNl: "",
    ...overrides,
  };
}

function mountDrawer(props: Partial<InstanceType<typeof CmsEventsDrawer>["$props"]> = {}) {
  const halls: Hall[] = [
    { id: 1, old_id: null, address: "Street", name: { nl: "Grote zaal" } } as Hall,
    { id: 2, old_id: null, address: "Other", name: { nl: "" } } as Hall,
  ];

  return mount(CmsEventsDrawer, {
    props: {
      show: true,
      selectedProduction: buildProduction(),
      selectedEventRows: [buildEventRow()],
      hallsData: halls,
      eventsPanelLoading: false,
      eventsPanelError: null,
      localizeValue: (map) => map?.nl ?? "",
      ...props,
    },
    global: {
      plugins: [i18n],
    },
  });
}

describe("CmsEventsDrawer.vue", () => {
  it("does not render when hidden or when no production is selected", () => {
    const hidden = mountDrawer({ show: false });
    expect(hidden.find(".cms-events-drawer").exists()).toBe(false);

    const noProduction = mountDrawer({ selectedProduction: null });
    expect(noProduction.find(".cms-events-drawer").exists()).toBe(false);
  });

  it("renders loading, error and empty states", () => {
    const loading = mountDrawer({ eventsPanelLoading: true });
    expect(loading.text()).toContain(i18n.global.t("cms.panel.saving"));

    const error = mountDrawer({ eventsPanelLoading: false, eventsPanelError: "Boom" });
    expect(error.text()).toContain("Boom");

    const empty = mountDrawer({ selectedEventRows: [] });
    expect(empty.text()).toContain(i18n.global.t("cms.actions.noRows"));
  });

  it("renders event rows, hall fallback and emits action events", async () => {
    const wrapper = mountDrawer({
      selectedProduction: buildProduction({ title: "", performer: "Fallback performer" }),
      selectedEventRows: [buildEventRow({ hallId: 2 })],
    });

    expect(wrapper.text()).toContain("Fallback performer");
    expect(wrapper.text()).toContain("Hall #2");

    await wrapper.get(".cms-side-close").trigger("click");
    await wrapper.get(".cms-side-save").trigger("click");

    const row = wrapper.get("tbody tr");
    await row.trigger("focusout");
    await row.trigger("keydown.enter");

    const actionButtons = wrapper.findAll(".cms-events-inline-action button");
    await actionButtons[0]?.trigger("click");
    await actionButtons[1]?.trigger("click");
    await wrapper.get(".cms-modal-footer .cms-side-save").trigger("click");

    expect(wrapper.emitted("close")?.length).toBe(1);
    expect(wrapper.emitted("open-create-event")?.length).toBe(1);
    expect(wrapper.emitted("event-row-focus-out")?.length).toBe(1);
    expect(wrapper.emitted("event-row-enter")?.length).toBe(1);
    expect(wrapper.emitted("save-linked-event")?.length).toBe(1);
    expect(wrapper.emitted("remove-linked-event")?.length).toBe(1);
  });

  it("updates editable row fields via v-model", async () => {
    const row = buildEventRow();
    const wrapper = mountDrawer({ selectedEventRows: [row] });

    const dateInputs = wrapper.findAll('input[type="datetime-local"]');
    await dateInputs[0]?.setValue("2026-05-01T10:00");
    await dateInputs[1]?.setValue("2026-05-01T12:00");

    await wrapper.get("select.cms-text-input").setValue("2");
    await wrapper.get('input[type="text"]').setValue("updated info");

    expect(row.startsAt).toBe("2026-05-01T10:00");
    expect(row.endsAt).toBe("2026-05-01T12:00");
    expect(row.hallId).toBe(2);
    expect(row.infoNl).toBe("updated info");
  });
});
