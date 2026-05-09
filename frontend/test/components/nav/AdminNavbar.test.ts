import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { RouteNames } from "@/router/routeNames";
import { i18n } from "@/i18n";
import AdminNavbar from "@/components/nav/AdminNavbar.vue";

const mockLogout = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/services/auth", () => ({
  logout: mockLogout,
  getCurrentlyLoggedInAdmin: vi.fn().mockRejectedValue(new Error("Unauthorized")),
}));

const mockAdmin = { id: 1, username: "testuser", super: false, profile_picture: null };

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/:lang/admin", name: RouteNames.ADMIN, component: { template: "<div>Admin</div>" } },
    { path: "/:lang/admin/cms", name: RouteNames.CMS, component: { template: "<div>CMS</div>" } },
    { path: "/:lang/admin/login", name: RouteNames.LOGIN, component: { template: "<div>Login</div>" } },
  ],
});

describe("AdminNavbar", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(async () => {
    pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore();
    authStore.admin = mockAdmin;
    mockLogout.mockReset();
    mockLogout.mockResolvedValue(undefined);
    await router.push("/nl/admin");
    await router.isReady();
  });

  function mountNavbar() {
    return mount(AdminNavbar, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: { NavControls: true },
      },
      props: { isDark: false },
    });
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders the admin username", () => {
    const wrapper = mountNavbar();
    expect(wrapper.text()).toContain("testuser");
  });

  it("renders initials when no profile picture", () => {
    const wrapper = mountNavbar();
    expect(wrapper.find(".avatar-fallback").text()).toBe("TE");
  });

  it("renders profile picture when set", () => {
    const authStore = useAuthStore();
    authStore.admin = { ...mockAdmin, profile_picture: "https://example.com/pic.jpg" };
    const wrapper = mountNavbar();
    expect(wrapper.find(".avatar-img").attributes("src")).toBe("https://example.com/pic.jpg");
  });

  it("hides avatar fallback when profile picture is set", () => {
    const authStore = useAuthStore();
    authStore.admin = { ...mockAdmin, profile_picture: "https://example.com/pic.jpg" };
    const wrapper = mountNavbar();
    expect(wrapper.find(".avatar-fallback").exists()).toBe(false);
  });

  it("displays '??' as initials when admin is null", () => {
    const authStore = useAuthStore();
    authStore.admin = null;
    const wrapper = mountNavbar();
    expect(wrapper.find(".avatar-fallback").text()).toBe("??");
  });

  it("renders dashboard and cms nav links", () => {
    const wrapper = mountNavbar();
    const links = wrapper.findAll("a");
    const hrefs = links.map(l => l.attributes("href"));
    expect(hrefs.some(h => h?.includes("admin"))).toBe(true);
    expect(hrefs.some(h => h?.includes("cms"))).toBe(true);
  });

  // ── Dropdown ───────────────────────────────────────────────────────────────

  it("dropdown is hidden by default", () => {
    const wrapper = mountNavbar();
    expect(wrapper.find(".dropdown").exists()).toBe(false);
  });

  it("opens the dropdown when profile button is clicked", async () => {
    const wrapper = mountNavbar();
    await wrapper.find(".profile-btn").trigger("click");
    expect(wrapper.find(".dropdown").exists()).toBe(true);
  });

  it("closes the dropdown when profile button is clicked again", async () => {
    const wrapper = mountNavbar();
    await wrapper.find(".profile-btn").trigger("click");
    await wrapper.find(".profile-btn").trigger("click");
    expect(wrapper.find(".dropdown").exists()).toBe(false);
  });

  it("closes the dropdown on outside click", async () => {
    const wrapper = mountNavbar();
    await wrapper.find(".profile-btn").trigger("click");
    expect(wrapper.find(".dropdown").exists()).toBe(true);
    document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".dropdown").exists()).toBe(false);
  });

  it("removes the click outside listener on unmount", async () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
    const wrapper = mountNavbar();
    wrapper.unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("click", expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  // ── Logout ─────────────────────────────────────────────────────────────────

  it("calls logout when sign out is clicked", async () => {
    const wrapper = mountNavbar();
    await wrapper.find(".profile-btn").trigger("click");
    await wrapper.find(".dropdown-item").trigger("click");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockLogout).toHaveBeenCalled();
  });

  it("clears the admin store on logout", async () => {
    const authStore = useAuthStore();
    const wrapper = mountNavbar();
    await wrapper.find(".profile-btn").trigger("click");
    await wrapper.find(".dropdown-item").trigger("click");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(authStore.admin).toBeNull();
  });

  it("redirects to login after logout", async () => {
    const wrapper = mountNavbar();
    await wrapper.find(".profile-btn").trigger("click");
    await wrapper.find(".dropdown-item").trigger("click");
    await new Promise(resolve => setTimeout(resolve, 0));
    await router.isReady();
    expect(router.currentRoute.value.name).toBe(RouteNames.LOGIN);
  });

  // ── Dark mode ──────────────────────────────────────────────────────────────

  it("emits toggle-dark when NavControls emits it", async () => {
    const wrapper = mountNavbar();
    await wrapper.findComponent({ name: "NavControls" }).vm.$emit("toggle-dark");
    expect(wrapper.emitted("toggle-dark")).toBeTruthy();
  });

  // ── Hamburger ──────────────────────────────────────────────────────────────

  describe("hamburger menu", () => {
    it("renders the hamburger button", () => {
      const wrapper = mountNavbar();
      expect(wrapper.find("button.hamburger").exists()).toBe(true);
    });

    it("drawer is hidden by default", () => {
      const wrapper = mountNavbar();
      expect(wrapper.find(".mobile-drawer").exists()).toBe(false);
    });

    it("opens the drawer when hamburger is clicked", async () => {
      const wrapper = mountNavbar();
      await wrapper.find("button.hamburger").trigger("click");
      expect(wrapper.find(".mobile-drawer").exists()).toBe(true);
    });

    it("closes the drawer when hamburger is clicked again", async () => {
      const wrapper = mountNavbar();
      await wrapper.find("button.hamburger").trigger("click");
      await wrapper.find("button.hamburger").trigger("click");
      expect(wrapper.find(".mobile-drawer").exists()).toBe(false);
    });

    it("renders drawer nav links when open", async () => {
      const wrapper = mountNavbar();
      await wrapper.find("button.hamburger").trigger("click");
      const drawerLinks = wrapper.find(".mobile-drawer").findAll("a.drawer-link");
      expect(drawerLinks.length).toBeGreaterThanOrEqual(2);
    });

    it("closes the drawer when a drawer link is clicked", async () => {
      const wrapper = mountNavbar();
      await wrapper.find("button.hamburger").trigger("click");
      await wrapper.find(".mobile-drawer a.drawer-link").trigger("click");
      expect(wrapper.find(".mobile-drawer").exists()).toBe(false);
    });

    it("sets aria-expanded to true when open", async () => {
      const wrapper = mountNavbar();
      await wrapper.find("button.hamburger").trigger("click");
      expect(wrapper.find("button.hamburger").attributes("aria-expanded")).toBe("true");
    });

    it("renders the drawer profile section when open", async () => {
      const wrapper = mountNavbar();
      await wrapper.find("button.hamburger").trigger("click");
      expect(wrapper.find(".mobile-drawer .drawer-profile").exists()).toBe(true);
      expect(wrapper.find(".mobile-drawer .drawer-username").text()).toBe("testuser");
    });

    it("renders drawer avatar fallback when no profile picture", async () => {
      const wrapper = mountNavbar();
      await wrapper.find("button.hamburger").trigger("click");
      expect(wrapper.find(".mobile-drawer .drawer-avatar-fallback").text()).toBe("TE");
    });

    it("renders drawer avatar image when profile picture is set", async () => {
      const authStore = useAuthStore();
      authStore.admin = { ...mockAdmin, profile_picture: "https://example.com/pic.jpg" };
      const wrapper = mountNavbar();
      await wrapper.find("button.hamburger").trigger("click");
      expect(wrapper.find(".mobile-drawer .drawer-avatar-img").attributes("src")).toBe("https://example.com/pic.jpg");
    });

    it("closes drawer and logs out when drawer sign out is clicked", async () => {
      const wrapper = mountNavbar();
      await wrapper.find("button.hamburger").trigger("click");
      await wrapper.find(".drawer-signout").trigger("click");
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(mockLogout).toHaveBeenCalled();
      expect(wrapper.find(".mobile-drawer").exists()).toBe(false);
    });

    it("closes the drawer when the overlay is clicked", async () => {
      const wrapper = mountNavbar();
      await wrapper.find("button.hamburger").trigger("click");
      expect(wrapper.find(".mobile-drawer").exists()).toBe(true);
      await wrapper.find(".fixed.inset-0").trigger("click");
      expect(wrapper.find(".mobile-drawer").exists()).toBe(false);
    });
  });
});