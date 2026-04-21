import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import CMSView from "@/views/admin/CMSView.vue";
import { i18n } from "@/i18n";
import CmsProductionsTab from "@/components/admin/cms/tabs/CmsProductionsTab.vue";
import { getInitialDark } from "@/composables/useDarkMode";
import * as productionsService from "@/services/productions";
import * as tagsService from "@/services/tags";
import * as hallsService from "@/services/halls";
import * as eventsService from "@/services/events";
import {
  hasAnyLanguageValue,
  mediaToLanguageMap,
  toLanguageMap,
  toLanguageMapOrNull,
} from "@/services/cms/forms";

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
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/:lang/admin", name: RouteNames.ADMIN, component: { template: "<div>Admin</div>" } },
    { path: "/:lang/admin/cms", name: RouteNames.CMS, component: CMSView },
    { path: "/:lang/admin/login", name: RouteNames.LOGIN, component: { template: "<div>Login</div>" } },
  ],
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const gridStub = defineComponent({
  name: "AgGridVue",
  props: {
    rowData: {
      type: Array,
      default: () => [],
    },
  },
  template: `
    <div data-testid="ag-grid-stub">
      <span data-testid="row-count">{{ rowData.length }}</span>
      <span data-testid="first-row-tags">{{ rowData[0]?.genres || "" }}|{{ rowData[0]?.tags || "" }}</span>
    </div>
  `,
});

const navbarStub = defineComponent({
  name: "AppNavbar",
  emits: ["toggle-dark"],
  template: '<button data-testid="nav-dark-toggle" @click="$emit(\'toggle-dark\')">toggle</button>',
});

const mockProduction = {
  id: 42,
  old_id: null,
  finalized: true,
  supertitle: { en: "Series" },
  title: { en: "Show" },
  artist: { en: "Artist" },
  tagline: { en: "Tagline" },
  teaser: { en: "Teaser" },
  description: null,
  description_extra: null,
  description_2: null,
  video_1: null,
  video_2: null,
  quote: null,
  quote_source: null,
  programme: null,
  info: null,
  tags: [1, 2] as unknown as ProductionWithBackwardsRefs["tags"],
  events: [] as unknown as ProductionWithBackwardsRefs["events"],
} as ProductionWithBackwardsRefs;

const mockPublicTag = {
  id: 1,
  old_id: null,
  name: { en: "PublicTag" },
  tag_type: 1 as never,
  public: true,
} as Tag;

const mockHiddenTag = {
  id: 2,
  old_id: null,
  name: { en: "HiddenTag" },
  tag_type: 1 as never,
  public: false,
} as Tag;

const mockHall = {
  id: 1,
  old_id: null,
  address: "Street",
  name: { en: "Main hall" },
} as Hall;

describe("CMSView", () => {
  function mountView() {
    return mount(CMSView, {
      global: {
        plugins: [i18n],
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

  it("shows productions tab by default", () => {
    const wrapper = mountView();
    expect(wrapper.get('[data-testid="cms-tab-productions"]').attributes("aria-selected")).toBe("true");
  });

  it("switches to tags tab", async () => {
    const wrapper = mountView();
    await wrapper.get('[data-testid="cms-tab-tags"]').trigger("click");
    expect(wrapper.get('[data-testid="cms-tab-tags"]').attributes("aria-selected")).toBe("true");
    expect(wrapper.find(".cms-tab-placeholder").exists()).toBe(true);
    await flushPromises();
    expect(wrapper.findComponent(CmsProductionsTab).exists()).toBe(false);
    expect(wrapper.get('[data-testid="cms-tab-tags"]').attributes("aria-selected")).toBe("true");
  });

  it("switches to admins tab", async () => {
    const wrapper = mountView();
    await wrapper.get('[data-testid="cms-tab-admins"]').trigger("click");
    expect(wrapper.get('[data-testid="cms-tab-admins"]').attributes("aria-selected")).toBe("true");
    expect(wrapper.find(".cms-tab-placeholder").exists()).toBe(true);
  });

  it("switches back to productions tab", async () => {
    const wrapper = mountView();
    await wrapper.get('[data-testid="cms-tab-tags"]').trigger("click");
    await wrapper.get('[data-testid="cms-tab-productions"]').trigger("click");
    expect(wrapper.get('[data-testid="cms-tab-productions"]').attributes("aria-selected")).toBe("true");
  });

  it("handles dark mode toggle event", async () => {
    const wrapper = mountView();
    await wrapper.get('button[aria-label="Toggle dark mode"]').trigger("click");
    expect(wrapper.exists()).toBe(true);
  });
});
