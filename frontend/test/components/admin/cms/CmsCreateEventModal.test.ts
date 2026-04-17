import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import type { Hall } from "@viernulvier/shared";
import { i18n } from "@/i18n";
import type { CmsCreateLinkedEventForm, CmsProductionGridRow } from "@/services/cms";
import CmsCreateEventModal from "@/components/admin/cms/CmsCreateEventModal.vue";

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

function buildForm(overrides: Partial<CmsCreateLinkedEventForm> = {}): CmsCreateLinkedEventForm {
  return {
    startsAt: "2026-04-13T10:00",
    endsAt: "2026-04-13T12:00",
    doorsAt: "2026-04-13T09:30",
    hallId: 1,
    infoNl: "",
    ...overrides,
  };
}

function mountModal(props: Partial<InstanceType<typeof CmsCreateEventModal>["$props"]> = {}) {
  const halls: Hall[] = [
    {
      id: 1,
      old_id: null,
      address: "Street",
      name: { nl: "Grote zaal" },
    } as Hall,
    {
      id: 2,
      old_id: null,
      address: "Other",
      name: { nl: "" },
    } as Hall,
  ];

  return mount(CmsCreateEventModal, {
    props: {
      open: true,
      selectedProduction: buildProduction(),
      createLinkedEventForm: buildForm(),
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

describe("CmsCreateEventModal.vue", () => {
  it("does not render when closed or when no production is selected", () => {
    const closed = mountModal({ open: false });
    expect(closed.find(".cms-modal-overlay").exists()).toBe(false);

    const noProduction = mountModal({ selectedProduction: null });
    expect(noProduction.find(".cms-modal-overlay").exists()).toBe(false);
  });

  it("renders selected production title with performer fallback", () => {
    const wrapper = mountModal({
      selectedProduction: buildProduction({ title: "", performer: "Fallback performer" }),
    });

    expect(wrapper.text()).toContain("Fallback performer");
  });

  it("renders localized hall labels with Hall # fallback", () => {
    const wrapper = mountModal();
    const options = wrapper.findAll("select option").map((option) => option.text());

    expect(options).toContain("Grote zaal");
    expect(options).toContain("Hall #2");
  });

  it("emits form field updates and close/submit", async () => {
    const wrapper = mountModal();

    await wrapper.get('input[type="datetime-local"]').setValue("2026-04-14T10:00");
    await wrapper.get('select.cms-text-input').setValue("2");
    await wrapper.get('input[type="text"]').setValue("extra info");

    const fieldUpdates = wrapper.emitted("update-form-field") ?? [];
    expect(fieldUpdates).toEqual([
      ["startsAt", "2026-04-14T10:00"],
      ["hallId", 2],
      ["infoNl", "extra info"],
    ]);

    await wrapper.get(".cms-modal-overlay").trigger("click");
    await wrapper.get(".cms-modal-overlay").trigger("click.self");
    await wrapper.findAll(".cms-side-close")[0]?.trigger("click");
    await wrapper.findAll(".cms-side-close")[1]?.trigger("click");
    await wrapper.get(".cms-side-save").trigger("click");

    expect(wrapper.emitted("close")?.length).toBeGreaterThan(0);
    expect(wrapper.emitted("submit")?.length).toBe(1);
  });

  it("shows error text and saving label while loading", () => {
    const wrapper = mountModal({
      eventsPanelLoading: true,
      eventsPanelError: "Could not save",
    });

    expect(wrapper.text()).toContain("Could not save");
    expect(wrapper.text()).toContain(i18n.global.t("cms.panel.saving"));
    expect(wrapper.get(".cms-side-save").attributes("disabled")).toBeDefined();
  });
});
