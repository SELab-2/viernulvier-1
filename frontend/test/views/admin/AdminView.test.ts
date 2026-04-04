import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { RouteNames } from "@/router/routeNames";
import AdminView from "@/views/admin/AdminView.vue";
import { i18n } from "@/i18n";

const mockAdmin = { id: 1, username: "admin", super: true, profile_picture: null };

vi.mock("@/services/auth", () => ({
  logout: vi.fn().mockResolvedValue(undefined),
  getCurrentlyLoggedInAdmin: vi.fn().mockRejectedValue(new Error("Unauthorized")),
}));

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/:lang/admin", name: RouteNames.ADMIN, component: AdminView },
    { path: "/:lang/admin/cms", name: RouteNames.CMS, component: { template: "<div>CMS</div>" } },
    { path: "/:lang/admin/login", name: RouteNames.LOGIN, component: { template: "<div>Login</div>" } },
  ],
});

describe("AdminView", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(async () => {
    pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore();
    authStore.admin = mockAdmin;
    await router.push("/nl/admin");
    await router.isReady();
  });

  function mountAdminView() {
    return mount(AdminView, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: { AdminNavbar: true, NavControls: true },
      },
    });
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  it("displays the username", () => {
    const wrapper = mountAdminView();
    expect(wrapper.text()).toContain("admin");
  });

  it("displays initials fallback when no profile picture", () => {
    const wrapper = mountAdminView();
    expect(wrapper.find(".profile-avatar-fallback").text()).toBe("AD");
  });

  it("displays the profile picture when set", () => {
    const authStore = useAuthStore();
    authStore.admin = { ...mockAdmin, profile_picture: "https://example.com/avatar.jpg" };
    const wrapper = mountAdminView();
    expect(wrapper.find(".profile-avatar").attributes("src")).toBe("https://example.com/avatar.jpg");
  });

  it("hides the profile picture fallback when profile picture is set", () => {
    const authStore = useAuthStore();
    authStore.admin = { ...mockAdmin, profile_picture: "https://example.com/avatar.jpg" };
    const wrapper = mountAdminView();
    expect(wrapper.find(".profile-avatar-fallback").exists()).toBe(false);
  });

  it("shows the super admin badge when admin is super", () => {
    const wrapper = mountAdminView();
    expect(wrapper.find(".super-badge").exists()).toBe(true);
  });

  it("hides the super admin badge when admin is not super", () => {
    const authStore = useAuthStore();
    authStore.admin = { ...mockAdmin, super: false };
    const wrapper = mountAdminView();
    expect(wrapper.find(".super-badge").exists()).toBe(false);
  });

  it("has a link to the CMS", () => {
    const wrapper = mountAdminView();
    expect(wrapper.find("a").attributes("href")).toContain("cms");
  });

  it("displays '??' as initials when admin is null", () => {
    const authStore = useAuthStore();
    authStore.admin = null;
    const wrapper = mountAdminView();
    expect(wrapper.find(".profile-avatar-fallback").text()).toBe("??");
  });
});