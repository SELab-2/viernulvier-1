import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { RouteNames } from "@/router/routeNames";
import AdminView from "@/views/admin/AdminView.vue";

const mockAdmin = { id: 1, username: "admin", profile_picture: null };

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
      global: { plugins: [pinia, router] },
    });
  }

  it("displays the username", () => {
    const wrapper = mountAdminView();
    expect(wrapper.text()).toContain("admin");
  });

  it("displays the profile picture", () => {
    const authStore = useAuthStore();
    authStore.admin = { ...mockAdmin, profile_picture: "https://example.com/avatar.jpg" };

    const wrapper = mountAdminView();
    expect(wrapper.find("img").attributes("src")).toBe("https://example.com/avatar.jpg");
  });

  it("falls back to favicon when profile picture is null", () => {
    const wrapper = mountAdminView();
    expect(wrapper.find("img").attributes("src")).toBe("/favicon.ico");
  });

  it("has a link to the CMS", () => {
    const wrapper = mountAdminView();
    expect(wrapper.find("a").attributes("href")).toContain("cms");
  });

  it("calls logout and redirects to login on logout button click", async () => {
    const { logout } = await import("@/services/auth");
    const wrapper = mountAdminView();

    await wrapper.find("button").trigger("click");
    await new Promise(resolve => setTimeout(resolve, 0)); // flush async
    await router.isReady();

    expect(logout).toHaveBeenCalled();
    expect(router.currentRoute.value.name).toBe(RouteNames.LOGIN);
  });

  it("clears the admin store on logout", async () => {
    const authStore = useAuthStore();
    const wrapper = mountAdminView();

    await wrapper.find("button").trigger("click");

    expect(authStore.admin).toBeNull();
  });
});