import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import CmsMediaPreviewModal from "@/components/admin/cms/productions/CmsMediaPreviewModal.vue";

describe("CmsMediaPreviewModal", () => {
  it("renders nothing when mediaPreview is null", () => {
    const wrapper = mount(CmsMediaPreviewModal, { props: { mediaPreview: null, mediaPreviewEditUrl: "", isSaving: false }, global: { plugins: [i18n] } });
    expect(wrapper.find("div.cms-modal-overlay").exists()).toBe(false);
  });

  it("renders image preview and emits remove-image", async () => {
    const mediaPreview = { kind: "image", url: "https://example.com/a.jpg", label: "A", imageId: 10, productionId: 1 } as any;
    const wrapper = mount(CmsMediaPreviewModal, { props: { mediaPreview, mediaPreviewEditUrl: "", isSaving: false }, global: { plugins: [i18n] } });

    const img = wrapper.find("img.cms-media-preview-large");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe(mediaPreview.url);

    const remove = wrapper.find("button.cms-remove-button");
    await remove.trigger("click");
    expect(wrapper.emitted()["remove-image"]).toBeTruthy();
  });

  it("add-image button triggers input click handler", async () => {
    const mediaPreview = { kind: "image", url: "https://example.com/a.jpg", label: "A", productionId: 1 } as any;
    const wrapper = mount(CmsMediaPreviewModal, { props: { mediaPreview, mediaPreviewEditUrl: "", isSaving: false }, global: { plugins: [i18n] } });

    const clickSpy = vi.fn();
    const fileInput = wrapper.find('input[type="file"]');
    // stub the underlying DOM element click
    (fileInput.element as any).click = clickSpy;

    const addBtn = wrapper.find("button.cms-side-save");
    await addBtn.trigger("click");
    expect(clickSpy).toHaveBeenCalled();
  });

  it("renders iframe for video kind and supports editing url save", async () => {
    const mediaPreview = { kind: "iframe", url: "https://www.youtube.com/embed/abc", label: "V", mediaField: "video_1" } as any;
    const wrapper = mount(CmsMediaPreviewModal, { props: { mediaPreview, mediaPreviewEditUrl: "https://youtu.be/abc", isSaving: false }, global: { plugins: [i18n] } });

    const iframe = wrapper.find("iframe.cms-media-preview-large");
    expect(iframe.exists()).toBe(true);

    const input = wrapper.find("input.cms-media-url-input");
    expect(input.exists()).toBe(true);
    await input.setValue("https://vimeo.com/123");
    expect(wrapper.emitted()["update:media-preview-edit-url"]).toBeTruthy();

    const save = wrapper.findAll("button.cms-side-save")[0];
    await save.trigger("click");
    expect(wrapper.emitted()["save-video-url"]).toBeTruthy();
    
    // remove-video button
    const removeVideo = wrapper.findAll("button.cms-remove-button")[0];
    await removeVideo.trigger("click");
    expect(wrapper.emitted()["remove-video"]).toBeTruthy();

    // header close and overlay close
    const headerClose = wrapper.find("header .cms-side-close");
    await headerClose.trigger("click");
    expect(wrapper.emitted()["close"]).toBeTruthy();

    // overlay self click should also emit close
    await wrapper.find("div.cms-modal-overlay").trigger("click");
    expect(wrapper.emitted()["close"].length).toBeGreaterThan(1);

    // keyup.enter on input should emit save-video-url as well
    await input.trigger("keyup.enter");
    expect(wrapper.emitted()["save-video-url"].length).toBeGreaterThan(1);
  });

  it("renders gallery and navigation emits", async () => {
    const mediaPreview = {
      kind: "gallery",
      url: "https://example.com/a.jpg",
      label: "G",
      images: [ { id: 1, url: "/m1.jpg" }, { id: 2, url: "/m2.jpg" } ],
      currentImageIndex: 0,
      productionId: 1,
    } as any;

    const wrapper = mount(CmsMediaPreviewModal, { props: { mediaPreview, mediaPreviewEditUrl: "", isSaving: false }, global: { plugins: [i18n] } });

    const thumbs = wrapper.findAll("button.cms-media-gallery-thumb");
    expect(thumbs.length).toBe(2);
    await thumbs[1].trigger("click");
    expect(wrapper.emitted()["sync-gallery-preview"]).toBeTruthy();

    const navButtons = wrapper.findAll(".cms-media-gallery-nav button");
    await navButtons[1].trigger("click");
    expect(wrapper.emitted()["sync-gallery-preview"]).toBeTruthy();
  });

  it("triggers image-selected when file input changes", async () => {
    const mediaPreview = { kind: "image", url: "https://example.com/a.jpg", label: "A", productionId: 1 } as any;
    const wrapper = mount(CmsMediaPreviewModal, { props: { mediaPreview, mediaPreviewEditUrl: "", isSaving: false }, global: { plugins: [i18n] } });

    const input = wrapper.find('input[type="file"]');
    const file = new File(["x"], "a.png", { type: "image/png" });
    // set files on the input element and trigger change
    Object.defineProperty(input.element, "files", { value: [file] });
    await input.trigger("change");
    expect(wrapper.emitted()["image-selected"]).toBeTruthy();
  });
});
