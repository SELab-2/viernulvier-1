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

  it("renders placeholder image with 'No media' text when URL contains SVG placeholder", () => {
    const placeholderDataUrl = "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%27800%27%20height%3D%27450%27%20viewBox%3D%270%200%20800%20450%27%3E%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20fill%3D%27%23f3f4f6%27/%3E%3Ctext%20x%3D%2750%25%27%20y%3D%2750%25%27%20fill%3D%27%23374151%27%20font-family%3D%27Arial%2C%20Helvetica%2C%20sans-serif%27%20font-size%3D%2724%27%20dominant-baseline%3D%27middle%27%20text-anchor%3D%27middle%27%3ENo%20media%3C/text%3E%3C/svg%3E";
    const mediaPreview = { kind: "image", url: placeholderDataUrl, label: "Images", productionId: 1 } as any;
    const wrapper = mount(CmsMediaPreviewModal, { props: { mediaPreview, mediaPreviewEditUrl: "", isSaving: false }, global: { plugins: [i18n] } });

    const img = wrapper.find("img.cms-media-preview-large");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe(placeholderDataUrl);
    
    // add image button should be visible
    const addBtn = wrapper.find("button.cms-side-save");
    expect(addBtn.exists()).toBe(true);
    // Button text will be translated based on the current locale
    expect(addBtn.text()).toBeTruthy();
  });

  it("shows blank iframe with URL input for video placeholder", () => {
    const mediaPreview = { kind: "iframe", url: "about:blank", label: "Media", mediaField: "video_1", productionId: 1 } as any;
    const wrapper = mount(CmsMediaPreviewModal, { props: { mediaPreview, mediaPreviewEditUrl: "", isSaving: false }, global: { plugins: [i18n] } });

    const iframe = wrapper.find("iframe.cms-media-preview-large");
    expect(iframe.exists()).toBe(true);
    expect(iframe.attributes("src")).toBe("about:blank");

    const input = wrapper.find("input.cms-media-url-input");
    expect(input.exists()).toBe(true);
  });

  it("placeholder image for gallery kind when URL is empty", () => {
    const placeholderDataUrl = "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%27800%27%20height%3D%27450%27%20viewBox%3D%270%200%20800%20450%27%3E%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20fill%3D%27%23f3f4f6%27/%3E%3Ctext%20x%3D%2750%25%27%20y%3D%2750%25%27%20fill%3D%27%23374151%27%20font-family%3D%27Arial%2C%20Helvetica%2C%20sans-serif%27%20font-size%3D%2724%27%20dominant-baseline%3D%27middle%27%20text-anchor%3D%27middle%27%3ENo%20media%3C/text%3E%3C/svg%3E";
    const mediaPreview = { kind: "gallery", url: placeholderDataUrl, label: "Images", images: [], productionId: 1 } as any;
    const wrapper = mount(CmsMediaPreviewModal, { props: { mediaPreview, mediaPreviewEditUrl: "", isSaving: false }, global: { plugins: [i18n] } });

    const img = wrapper.find("img.cms-media-preview-large");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe(placeholderDataUrl);
  });

  it("disables gallery nav buttons when only one image is present", () => {
    const mediaPreview = {
      kind: "gallery",
      url: "/m1.jpg",
      label: "G",
      images: [{ id: 1, url: "/m1.jpg" }],
      currentImageIndex: 0,
      productionId: 1,
    } as any;

    const wrapper = mount(CmsMediaPreviewModal, { props: { mediaPreview, mediaPreviewEditUrl: "", isSaving: false }, global: { plugins: [i18n] } });

    const navButtons = wrapper.findAll(".cms-media-gallery-nav button");
    expect(navButtons.length).toBe(2);
    expect((navButtons[0].element as HTMLButtonElement).disabled).toBe(true);
    expect((navButtons[1].element as HTMLButtonElement).disabled).toBe(true);
  });

  it("falls back to 0 when gallery currentImageIndex is undefined", async () => {
    const mediaPreview = {
      kind: "gallery",
      url: "/m1.jpg",
      label: "G",
      images: [{ id: 1, url: "/m1.jpg" }, { id: 2, url: "/m2.jpg" }],
      productionId: 1,
    } as any;

    const wrapper = mount(CmsMediaPreviewModal, { props: { mediaPreview, mediaPreviewEditUrl: "", isSaving: false }, global: { plugins: [i18n] } });

    const count = wrapper.find(".cms-media-gallery-count");
    expect(count.text()).toContain("1 / 2");

    const thumbs = wrapper.findAll("button.cms-media-gallery-thumb");
    expect(thumbs[0].classes()).toContain("active");
    expect(thumbs[1].classes()).not.toContain("active");

    // Click prev/next while currentImageIndex is undefined to exercise the `?? 0` fallback
    const navButtons = wrapper.findAll(".cms-media-gallery-nav button");
    await navButtons[0].trigger("click");
    await navButtons[1].trigger("click");
    const events = wrapper.emitted()["sync-gallery-preview"] ?? [];
    expect(events).toEqual([[-1], [1]]);
  });

  it("renders gallery without images and disables nav buttons", () => {
    const mediaPreview = {
      kind: "gallery",
      url: "/m1.jpg",
      label: "G",
      productionId: 1,
    } as any;

    const wrapper = mount(CmsMediaPreviewModal, { props: { mediaPreview, mediaPreviewEditUrl: "", isSaving: false }, global: { plugins: [i18n] } });

    const navButtons = wrapper.findAll(".cms-media-gallery-nav button");
    expect(navButtons.length).toBe(2);
    expect((navButtons[0].element as HTMLButtonElement).disabled).toBe(true);
    expect((navButtons[1].element as HTMLButtonElement).disabled).toBe(true);

    const count = wrapper.find(".cms-media-gallery-count");
    expect(count.text()).toContain("0");
  });

  it("enables add-image button only when productionId exists on placeholder", () => {
    const placeholderDataUrl = "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%27800%27%20height%3D%27450%27%20viewBox%3D%270%200%20800%20450%27%3E%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20fill%3D%27%23f3f4f6%27/%3E%3Ctext%20x%3D%2750%25%27%20y%3D%2750%25%27%20fill%3D%27%23374151%27%20font-family%3D%27Arial%2C%20Helvetica%2C%20sans-serif%27%20font-size%3D%2724%27%20dominant-baseline%3D%27middle%27%20text-anchor%3D%27middle%27%3ENo%20media%3C/text%3E%3C/svg%3E";
    
    // Without productionId, add button should not show
    let mediaPreview = { kind: "image", url: placeholderDataUrl, label: "Images" } as any;
    let wrapper = mount(CmsMediaPreviewModal, { props: { mediaPreview, mediaPreviewEditUrl: "", isSaving: false }, global: { plugins: [i18n] } });
    let addBtn = wrapper.findAll("button.cms-side-save");
    expect(addBtn.length).toBe(0);

    // With productionId, add button should show
    mediaPreview = { kind: "image", url: placeholderDataUrl, label: "Images", productionId: 42 } as any;
    wrapper = mount(CmsMediaPreviewModal, { props: { mediaPreview, mediaPreviewEditUrl: "", isSaving: false }, global: { plugins: [i18n] } });
    addBtn = wrapper.findAll("button.cms-side-save");
    expect(addBtn.length).toBeGreaterThan(0);
  });
});
