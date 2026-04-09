import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { RouteNames } from "@/router/routeNames";
import { i18n } from "@/i18n";
import CMSView from "@/views/admin/CMSView.vue";

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

describe("CMSView", () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    useAuthStore().admin = { id: 1, username: "admin", super: false, profile_picture: null };
    await router.push("/en/admin/cms");
    await router.isReady();
  });

  function mountCMSView() {
    return mount(CMSView, {
      global: {
        plugins: [createPinia(), router, i18n],
        stubs: { AdminNavbar: true },
      },
    });
  }

  it("renders without errors", () => {
    const wrapper = mountCMSView();
    expect(wrapper.exists()).toBe(true);
  });

  it("renders the CMS text", () => {
    const wrapper = mountCMSView();
    expect(wrapper.text()).toContain("CMS (admin only)");
  });
});