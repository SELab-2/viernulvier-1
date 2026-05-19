import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import type { BlogPostWithBackwardsRefs, ProductionWithBackwardsRefs } from "@viernulvier/shared";
import { routes } from "@/router/routes";
import { i18n } from "@/i18n";
import { ApiError } from "@/services/api";
import BlogPostDetailView from "@/views/BlogPostDetailView.vue";

vi.mock("@/services/blogposts", () => ({ getBlogPost: vi.fn() }));
vi.mock("@/services/productions", () => ({ getProduction: vi.fn() }));
vi.mock("@/services/media", () => ({
  getImagesForProductionOrEmpty: vi.fn(),
  getImagesForProductionsOrEmpty: vi.fn(),
}));
vi.mock("@/services/events", () => ({ getEvents: vi.fn() }));

vi.mock("@/components/nav/AppNavbar.vue", () => ({
  default: { template: '<div data-testid="app-navbar" />' },
}));
vi.mock("@/components/AppFooter.vue", () => ({
  default: { template: '<div data-testid="app-footer" />' },
}));
vi.mock("@/components/blogpost/LinkedProductionsCarousel.vue", () => ({
  default: { template: '<div data-testid="linked-productions-carousel" />', props: ["productions", "thumbnails", "dateRanges"] },
}));

import { getBlogPost } from "@/services/blogposts";
import { getProduction } from "@/services/productions";
import { getImagesForProductionOrEmpty, getImagesForProductionsOrEmpty } from "@/services/media";
import { getEvents } from "@/services/events";

const makePost = (overrides: Partial<BlogPostWithBackwardsRefs> = {}): BlogPostWithBackwardsRefs =>
  ({
    id: 1,
    title: { nl: "Mijn blogpost" },
    content: { nl: "## Hallo\n\nDit is de inhoud." },
    published_at: "2024-06-01T00:00:00.000Z",
    productions: [],
    ...overrides,
  }) as BlogPostWithBackwardsRefs;

const makeProduction = (id: number): ProductionWithBackwardsRefs =>
  ({
    id,
    title: { nl: `Productie ${id}` },
    artist: { nl: `Artiest ${id}` },
    tags: [],
    events: [],
  }) as unknown as ProductionWithBackwardsRefs;

const makeEvent = (startsAt: string) =>
  ({
    id: 1,
    old_id: null,
    starts_at: new Date(startsAt),
    production: null,
    hall: null,
    price: [],
  }) as any;
async function mountView(id = "1") {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(`/nl/blog/${id}`);
  await router.isReady();

  const wrapper = mount(BlogPostDetailView, {
    props: { id },
    global: { plugins: [router, i18n] },
  });
  return wrapper;
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("BlogPostDetailView.vue", () => {
  beforeEach(() => {
    vi.mocked(getImagesForProductionOrEmpty).mockResolvedValue([]);
    vi.mocked(getImagesForProductionsOrEmpty).mockResolvedValue(new Map());
    vi.mocked(getEvents).mockResolvedValue([]);
  });

  afterEach(() => {
    i18n.global.locale.value = "nl";
    vi.resetAllMocks();
  });

  // ── Loading state ──────────────────────────────────────────────────────────
  it("shows the loading indicator before the post resolves", async () => {
    vi.mocked(getBlogPost).mockReturnValue(new Promise(() => {}));
    const wrapper = await mountView();

    expect(wrapper.find('[role="status"]').exists()).toBe(true);
    expect(wrapper.find("article").exists()).toBe(false);
    wrapper.unmount();
  });

  // ── Happy path ─────────────────────────────────────────────────────────────
  it("renders the article after the post loads", async () => {
    vi.mocked(getBlogPost).mockResolvedValue(makePost());
    const wrapper = await mountView();
    await flushPromises();

    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.find("article").exists()).toBe(true);
    wrapper.unmount();
  });

  it("renders the post title in an h1", async () => {
    vi.mocked(getBlogPost).mockResolvedValue(makePost());
    const wrapper = await mountView();
    await flushPromises();

    expect(wrapper.find("h1").text()).toBe("Mijn blogpost");
    wrapper.unmount();
  });

  it("renders the body html from the markdown content", async () => {
    vi.mocked(getBlogPost).mockResolvedValue(makePost());
    const wrapper = await mountView();
    await flushPromises();

    const prose = wrapper.find(".prose");
    expect(prose.find("h2").exists()).toBe(true);
    wrapper.unmount();
  });

  it("renders the formatted published date", async () => {
    vi.mocked(getBlogPost).mockResolvedValue(makePost({ published_at: new Date("2024-06-01T00:00:00.000Z") }));
    const wrapper = await mountView();
    await flushPromises();

    expect(wrapper.find("header").text()).toContain("2024");
    wrapper.unmount();
  });

  it("omits the date line when published_at is absent", async () => {
    vi.mocked(getBlogPost).mockResolvedValue(makePost({ published_at: undefined }));
    const wrapper = await mountView();
    await flushPromises();

    const header = wrapper.find("header");
    expect(header.findAll("div")).toHaveLength(0);
    wrapper.unmount();
  });

  it("uses the active locale to display the title", async () => {
    i18n.global.locale.value = "fr";
    vi.mocked(getBlogPost).mockResolvedValue(
      makePost({ title: { nl: "Nederlandse titel", fr: "Titre français" } }),
    );
    const wrapper = await mountView();
    await flushPromises();

    expect(wrapper.find("h1").text()).toBe("Titre français");
    wrapper.unmount();
  });

  it("falls back to the next non-empty translation if active locale key is empty string", async () => {
    i18n.global.locale.value = "nl";
    vi.mocked(getBlogPost).mockResolvedValue(
      makePost({ title: { nl: "", en: "English fallback title" } }),
    );
    const wrapper = await mountView();
    await flushPromises();

    expect(wrapper.find("h1").text()).toBe("English fallback title");
    wrapper.unmount();
  });

  // ── Error states ───────────────────────────────────────────────────────────
  it("shows the not-found error when the API returns 404", async () => {
    vi.mocked(getBlogPost).mockRejectedValue(new ApiError(404, "Not Found"));
    const wrapper = await mountView();
    await flushPromises();

    const notFoundComponent = wrapper.findComponent({ name: "NotFound" });
    expect(notFoundComponent.exists()).toBe(true);
    expect(notFoundComponent.props("title")).toBe(i18n.global.t("blogpost.notFound"));
    expect(wrapper.find("article").exists()).toBe(false);
    wrapper.unmount();
  });

  it("shows the generic error for non-404 API failures", async () => {
    vi.mocked(getBlogPost).mockRejectedValue(new ApiError(500, "Server Error"));
    const wrapper = await mountView();
    await flushPromises();

    const notFoundComponent = wrapper.findComponent({ name: "NotFound" });
    expect(notFoundComponent.exists()).toBe(true);
    expect(notFoundComponent.props("title")).toBe(i18n.global.t("blogpost.errorGenericTitle"));
    expect(notFoundComponent.props("title")).not.toBe(i18n.global.t("blogpost.notFound"));
    wrapper.unmount();
  });

  it("shows the generic error for unexpected (non-ApiError) failures", async () => {
    vi.mocked(getBlogPost).mockRejectedValue(new Error("Network failure"));
    const wrapper = await mountView();
    await flushPromises();

    const notFoundComponent = wrapper.findComponent({ name: "NotFound" });
    expect(notFoundComponent.exists()).toBe(true);
    expect(notFoundComponent.props("title")).toBe(i18n.global.t("blogpost.errorGenericTitle"));
    wrapper.unmount();
  });

  it("renders a back-to-all-blogposts link in the error state", async () => {
    vi.mocked(getBlogPost).mockRejectedValue(new ApiError(404, "Not Found"));
    const wrapper = await mountView();
    await flushPromises();

    const notFoundComponent = wrapper.findComponent({ name: "NotFound" });
    expect(notFoundComponent.exists()).toBe(true);
    expect(notFoundComponent.props("buttonLabel")).toBe(i18n.global.t("blogpost.backToBlog"));
    wrapper.unmount();
  });

  it("shows the not-found error when the id is not a valid integer", async () => {
    const wrapper = await mountView("abc");
    await flushPromises();

    const notFoundComponent = wrapper.findComponent({ name: "NotFound" });
    expect(notFoundComponent.exists()).toBe(true);
    expect(notFoundComponent.props("title")).toBe(i18n.global.t("blogpost.notFound"));
    expect(wrapper.find("article").exists()).toBe(false);
    expect(getBlogPost).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("shows the not-found error when the id is less than or equal to zero", async () => {
    const wrapper = await mountView("0");
    await flushPromises();

    const notFoundComponent = wrapper.findComponent({ name: "NotFound" });
    expect(notFoundComponent.exists()).toBe(true);
    expect(notFoundComponent.props("title")).toBe(i18n.global.t("blogpost.notFound"));
    expect(wrapper.find("article").exists()).toBe(false);
    expect(getBlogPost).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  // ── Linked productions ─────────────────────────────────────────────────────
  it("renders the carousel stub when the post has linked productions", async () => {
    vi.mocked(getBlogPost).mockResolvedValue(makePost({ productions: [10, 20] as unknown as BlogPostWithBackwardsRefs["productions"] }));
    vi.mocked(getProduction)
      .mockResolvedValueOnce(makeProduction(10))
      .mockResolvedValueOnce(makeProduction(20));

    const wrapper = await mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="linked-productions-carousel"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("passes the resolved productions to the carousel", async () => {
    vi.mocked(getBlogPost).mockResolvedValue(makePost({ productions: [10] as unknown as BlogPostWithBackwardsRefs["productions"] }));
    vi.mocked(getProduction).mockResolvedValueOnce(makeProduction(10));

    const wrapper = await mountView();
    await flushPromises();

    const carousel = wrapper.findComponent({ name: "LinkedProductionsCarousel" });
    expect((carousel.props("productions") as ProductionWithBackwardsRefs[]).map((p) => p.id)).toEqual([10]);
    wrapper.unmount();
  });

  it("still renders the article when a production fetch fails", async () => {
    vi.mocked(getBlogPost).mockResolvedValue(makePost({ productions: [10, 20] as unknown as BlogPostWithBackwardsRefs["productions"] }));
    vi.mocked(getProduction)
      .mockResolvedValueOnce(makeProduction(10))
      .mockRejectedValueOnce(new ApiError(404, "Not Found"));

    const wrapper = await mountView();
    await flushPromises();

    expect(wrapper.find("article").exists()).toBe(true);
    const carousel = wrapper.findComponent({ name: "LinkedProductionsCarousel" });
    expect((carousel.props("productions") as ProductionWithBackwardsRefs[]).map((p) => p.id)).toEqual([10]);
    wrapper.unmount();
  });

  // ── Date range formatting ──────────────────────────────────────────────────
  it("formats a single-year event range as just the year", async () => {
    vi.mocked(getBlogPost).mockResolvedValue(makePost({ productions: [10] as unknown as BlogPostWithBackwardsRefs["productions"] }));
    vi.mocked(getProduction).mockResolvedValueOnce(makeProduction(10));
    vi.mocked(getEvents).mockResolvedValueOnce([
      makeEvent("2024-03-01T00:00:00.000Z"),
      makeEvent("2024-11-15T00:00:00.000Z"),
    ]);

    const wrapper = await mountView();
    await flushPromises();

    const carousel = wrapper.findComponent({ name: "LinkedProductionsCarousel" });
    expect((carousel.props("dateRanges") as Map<number, string>).get(10)).toBe("2024");
    wrapper.unmount();
  });

  it("formats a multi-year event range as 'minYear-maxYear'", async () => {
    vi.mocked(getBlogPost).mockResolvedValue(makePost({ productions: [10] as unknown as BlogPostWithBackwardsRefs["productions"] }));
    vi.mocked(getProduction).mockResolvedValueOnce(makeProduction(10));
    vi.mocked(getEvents).mockResolvedValueOnce([
      makeEvent("2023-01-10T00:00:00.000Z"),
      makeEvent("2025-08-20T00:00:00.000Z"),
    ]);

    const wrapper = await mountView();
    await flushPromises();

    const carousel = wrapper.findComponent({ name: "LinkedProductionsCarousel" });
    expect((carousel.props("dateRanges") as Map<number, string>).get(10)).toBe("2023-2025");
    wrapper.unmount();
  });

  it("sets an empty date range when a production has no events", async () => {
    vi.mocked(getBlogPost).mockResolvedValue(makePost({ productions: [10] as unknown as BlogPostWithBackwardsRefs["productions"] }));
    vi.mocked(getProduction).mockResolvedValueOnce(makeProduction(10));
    vi.mocked(getEvents).mockResolvedValueOnce([]);

    const wrapper = await mountView();
    await flushPromises();

    const carousel = wrapper.findComponent({ name: "LinkedProductionsCarousel" });
    expect((carousel.props("dateRanges") as Map<number, string>).get(10)).toBe("");
    wrapper.unmount();
  });

  // ── Reactivity ────────────────────────────────────────────────────────────
  it("reloads when the id prop changes", async () => {
    vi.mocked(getBlogPost)
      .mockResolvedValueOnce(makePost({ title: { nl: "Eerste post" } }))
      .mockResolvedValueOnce(makePost({ title: { nl: "Tweede post" } }));

    const wrapper = await mountView("1");
    await flushPromises();
    expect(wrapper.find("h1").text()).toBe("Eerste post");

    await wrapper.setProps({ id: "2" });
    await flushPromises();
    expect(wrapper.find("h1").text()).toBe("Tweede post");
    expect(vi.mocked(getBlogPost)).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
});
