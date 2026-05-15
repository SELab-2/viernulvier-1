import { describe, expect, it, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import CmsView from "@/views/admin/CmsView.vue";
import { i18n } from "@/i18n";
import { RouteNames } from "@/router/routeNames";
import CmsProductionsTab from "@/components/admin/cms/productions/CmsProductionsTab.vue";
import CmsTagsTab from "@/components/admin/cms/tags/CmsTagsTab.vue";
import CmsAdminsTab from "@/components/admin/cms/admins/CmsAdminsTab.vue";

vi.mock("@/services/productions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/productions")>();
  return {
    ...actual,
    getProductions: vi.fn(),
    createProduction: vi.fn(),
    updateProduction: vi.fn(),
  };
});

vi.mock("@/services/tags", () => ({
  getAllTags: vi.fn(),
  getTagsForProduction: vi.fn(),
  getTagTypes: vi.fn().mockResolvedValue([]),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}));

vi.mock("@/services/halls", () => ({
  getHalls: vi.fn(),
  getHall: vi.fn(),
}));

vi.mock("@/services/events", () => ({
  createEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getEvent: vi.fn(),
  updateEvent: vi.fn(),
}));

vi.mock("@/services/auth", () => ({
  logout: vi.fn().mockResolvedValue(undefined),
  getCurrentlyLoggedInAdmin: vi.fn().mockRejectedValue(new Error("Unauthorized")),
  deleteAdmin: vi.fn().mockRejectedValue(new Error("Unauthorized")),
}));

vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})));

type CmsTab = "productions" | "tags" | "admins";

describe("CmsView", () => {
  let testRouter: ReturnType<typeof createRouter>;
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(async () => {
    pinia = createPinia();
    setActivePinia(pinia);

    testRouter = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/:lang/admin", name: RouteNames.ADMIN, component: { template: "<div>Admin</div>" } },
        { path: "/:lang/admin/cms", name: RouteNames.CMS, component: CmsView },
        { path: "/:lang/admin/login", name: RouteNames.LOGIN, component: { template: "<div>Login</div>" } },
      ],
    });
    // Navigate to CMS route before tests
    testRouter.push({ path: "/en/admin/cms" });
    await testRouter.isReady();
  });

  function mountView() {
    return mount(CmsView, {
      global: {
        plugins: [i18n, testRouter, pinia],
        stubs: {
          AdminNavbar: {
            template: '<button aria-label="Toggle dark mode" @click="$emit(\'toggle-dark\')">toggle</button>',
          },
          AppFooter: true,
          AgGridVue: true,
        },
      },
    });
  }

  function tabSelector(tab: CmsTab): string {
    return `[data-testid="cms-tab-${tab}"]`;
  }

  function mountCmsView() {
    return mountView();
  }

  it("renders without errors", async () => {
    const wrapper = await mountCmsView();
    expect(wrapper.exists()).toBe(true);
  });

  it("shows the productions tab by default", async () => {
    const wrapper = await mountCmsView();
    expect(wrapper.findComponent(CmsProductionsTab).exists()).toBe(true);
    expect(wrapper.get('[data-testid="cms-tab-productions"]').attributes("aria-selected")).toBe("true");
  });

  it("switches to the tags tab and unmounts productions", async () => {
    const wrapper = await mountCmsView();
    await wrapper.get('[data-testid="cms-tab-tags"]').trigger("click");
    await flushPromises(); // wait for router to update (URL params changed)
    expect(wrapper.findComponent(CmsProductionsTab).exists()).toBe(false);
    expect(wrapper.findComponent(CmsTagsTab).exists()).toBe(true);
  });

  it("switches to the admins tab", async () => {
    const wrapper = await mountCmsView();
    await wrapper.get('[data-testid="cms-tab-admins"]').trigger("click");
    await flushPromises(); // wait for router to update (URL params changed)
    expect(wrapper.findComponent(CmsProductionsTab).exists()).toBe(false);
    expect(wrapper.findComponent(CmsAdminsTab).exists()).toBe(true);
  });

  it("switches back to productions after visiting another tab", async () => {
    const wrapper = await mountCmsView();
    await wrapper.get('[data-testid="cms-tab-tags"]').trigger("click");
    await wrapper.get('[data-testid="cms-tab-productions"]').trigger("click");
    await flushPromises();
    expect(wrapper.findComponent(CmsProductionsTab).exists()).toBe(true);
  });

  it("renders the CMS text", async () => {
    const wrapper = await mountCmsView();
    expect(wrapper.text()).toMatch(/Gegevens bewerken|CMS \(admin only\)/);
  });

  async function clickTab(wrapper: ReturnType<typeof mountView>, tab: CmsTab): Promise<void> {
    await wrapper.get(tabSelector(tab)).trigger("click");
    await flushPromises();
  }

  function expectSelected(wrapper: ReturnType<typeof mountView>, tab: CmsTab): void {
    expect(wrapper.get(tabSelector(tab)).attributes("aria-selected")).toBe("true");
  }

  it("shows productions tab by default", () => {
    const wrapper = mountView();
    expectSelected(wrapper, "productions");
  });

  it.each<CmsTab>(["tags", "admins"])("switches to %s tab", async (tab) => {
    const wrapper = mountView();
    await clickTab(wrapper, tab);
    expectSelected(wrapper, tab);
  });

  it("switches back to productions tab", async () => {
    const wrapper = mountView();
    await clickTab(wrapper, "tags");
    await clickTab(wrapper, "productions");
    expectSelected(wrapper, "productions");
  });

  it("handles dark mode toggle event", async () => {
    const wrapper = mountView();
    await wrapper.get('button[aria-label="Toggle dark mode"]').trigger("click");
    expect(wrapper.exists()).toBe(true);
  });
});
