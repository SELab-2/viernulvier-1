import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import type { CreateBlogPostFormState } from "@/services/cms";
import { buildEmptyBlogPostForm } from "@/services/cms";
import CmsCreateBlogPostModal from "@/components/admin/cms/blogposts/CmsCreateBlogPostModal.vue";

function mountModal(
  overrides: Partial<CreateBlogPostFormState> = {},
  open = true,
) {
  return mount(CmsCreateBlogPostModal, {
    global: { plugins: [i18n] },
    props: {
      open,
      createForm: {
        ...buildEmptyBlogPostForm(),
        ...overrides,
      },
      createExtraLangs: { en: false, fr: false },
      visibleCreateLangs: ["nl"],
      langGridClass: "cms-lang-grid cms-lang-grid-single",
      createError: null,
      isCreating: false,
    },
  });
}

describe("CmsCreateBlogPostModal", () => {
  it("does not render when closed", () => {
    const wrapper = mountModal({}, false);
    expect(wrapper.find(".cms-modal").exists()).toBe(false);
  });

  it("emits update-title on title input", async () => {
    const wrapper = mountModal();

    await wrapper
      .get('[data-testid="cms-create-blogpost-title-nl"]')
      .setValue("New blog post");

    const events = wrapper.emitted("update-title");

    expect(events?.[events.length - 1]).toEqual([
      "nl",
      "New blog post",
    ]);
  });

  it("emits update-content on content textarea input", async () => {
    const wrapper = mountModal();

    await wrapper
      .get('[data-testid="cms-create-blogpost-content-nl"]')
      .setValue("Lorem ipsum");

    const events = wrapper.emitted("update-content");

    expect(events?.[events.length - 1]).toEqual([
      "nl",
      "Lorem ipsum",
    ]);
  });

  it("emits update-extra-lang when toggling EN/FR pills", async () => {
    const wrapper = mountModal();

    const pills = wrapper.findAll(".cms-language-pill");

    await pills[1].trigger("click");
    await pills[2].trigger("click");

    const events = wrapper.emitted("update-extra-lang") ?? [];

    expect(events[0]).toEqual(["en", true]);
    expect(events[1]).toEqual(["fr", true]);
  });

  it("emits add-production-id with parsed production id", async () => {
    const wrapper = mountModal();

    await wrapper
      .get('[data-testid="cms-create-blogpost-production-input"]')
      .setValue("42");

    await wrapper
      .get(".cms-production-entry")
      .trigger("submit");

    expect(wrapper.emitted("add-production-id")?.[0]).toEqual([42]);
  });

  it("does not emit add-production-id for invalid ids", async () => {
    const wrapper = mountModal();

    await wrapper
      .get('[data-testid="cms-create-blogpost-production-input"]')
      .setValue("-1");

    await wrapper
      .get(".cms-production-entry")
      .trigger("submit");

    expect(wrapper.emitted("add-production-id")).toBeUndefined();
  });

  it("renders added production ids", () => {
    const wrapper = mountModal({
      productions: [12, 48, 91],
    });

    expect(wrapper.text()).toContain("12");
    expect(wrapper.text()).toContain("48");
    expect(wrapper.text()).toContain("91");
  });

  it("emits remove-production-id when clicking remove button", async () => {
    const wrapper = mountModal({
      productions: [12],
    });

    await wrapper
      .get(".cms-production-tag-remove")
      .trigger("click");

    expect(wrapper.emitted("remove-production-id")?.[0]).toEqual([12]);
  });

  it("emits close on overlay click and cancel button", async () => {
    const wrapper = mountModal();

    await wrapper.get(".cms-modal-overlay").trigger("click");
    await wrapper.get(".cms-modal-header .cms-side-close").trigger("click");

    expect((wrapper.emitted("close") ?? []).length)
      .toBeGreaterThanOrEqual(2);
  });

  it("emits submit on save button click", async () => {
    const wrapper = mountModal();

    await wrapper.get(".cms-side-save").trigger("click");

    expect(wrapper.emitted("submit")).toHaveLength(1);
  });

  it("disables save button while creating", () => {
    const wrapper = mount(CmsCreateBlogPostModal, {
      global: { plugins: [i18n] },
      props: {
        open: true,
        createForm: buildEmptyBlogPostForm(),
        createExtraLangs: { en: false, fr: false },
        visibleCreateLangs: ["nl"],
        langGridClass: "cms-lang-grid cms-lang-grid-single",
        createError: null,
        isCreating: true,
      },
    });

    expect(
      (wrapper.get(".cms-side-save").element as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("renders create error when present", () => {
    const wrapper = mount(CmsCreateBlogPostModal, {
      global: { plugins: [i18n] },
      props: {
        open: true,
        createForm: buildEmptyBlogPostForm(),
        createExtraLangs: { en: false, fr: false },
        visibleCreateLangs: ["nl"],
        langGridClass: "cms-lang-grid cms-lang-grid-single",
        createError: "Something went wrong",
        isCreating: false,
      },
    });

    expect(wrapper.text()).toContain("Something went wrong");
  });
});