import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import { RouteNames } from "@/router/routeNames";
import { ApiError } from "@/services/auth";
import { i18n } from "@/i18n";
import LoginView from "@/views/admin/LoginView.vue";
import { nextTick } from "vue";
import { useDarkMode } from "@/composables/useDarkMode";

const mockLogin = vi.hoisted(() => vi.fn());

vi.mock("@/services/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/auth")>();
  return { ...actual, login: mockLogin };
});

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/:lang/admin/login", name: RouteNames.LOGIN, component: LoginView },
    { path: "/:lang/admin", name: RouteNames.ADMIN, component: { template: "<div>Admin</div>" } },
    { path: "/:lang/admin/cms", name: RouteNames.CMS, component: { template: "<div>CMS</div>" } },
  ],
});

describe("LoginView", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(async () => {
    pinia = createPinia();
    setActivePinia(pinia);
    mockLogin.mockReset();
    i18n.global.locale.value = "en" as any;
    await router.push("/en/admin/login");
    await router.isReady();
    const { isDark, toggleDark } = useDarkMode();
    if (isDark.value) toggleDark(); // reset to light mode
    await nextTick();
  });

  function mountLoginView() {
    return mount(LoginView, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: { NavControls: true },
      },
    });
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders a username input", () => {
    const wrapper = mountLoginView();
    expect(wrapper.find("input[type='text']").exists()).toBe(true);
  });

  it("renders a password input", () => {
    const wrapper = mountLoginView();
    expect(wrapper.find("input[type='password']").exists()).toBe(true);
  });

  it("renders a login button", () => {
    const wrapper = mountLoginView();
    expect(wrapper.find(".submit-btn").exists()).toBe(true);
  });

  it("does not show an error initially", () => {
    const wrapper = mountLoginView();
    expect(wrapper.find("#error").exists()).toBe(false);
  });

  // ── Successful login ───────────────────────────────────────────────────────

  it("calls login with the entered credentials", async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const wrapper = mountLoginView();

    await wrapper.find("input[type='text']").setValue("admin");
    await wrapper.find("input[type='password']").setValue("secret");
    await wrapper.find(".submit-btn").trigger("click");
    await flushPromises();

    expect(mockLogin).toHaveBeenCalledWith({ username: "admin", password: "secret" });
  });

  it("redirects to admin after successful login without redirect param", async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const wrapper = mountLoginView();

    await wrapper.find(".submit-btn").trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe(RouteNames.ADMIN);
  });

  it("redirects to the redirect param after successful login", async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    await router.push("/en/admin/login?redirect=%2Fen%2Fadmin%2Fcms");
    const wrapper = mountLoginView();

    await wrapper.find(".submit-btn").trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe(RouteNames.CMS);
  });

  it("triggers login on enter key in username field", async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const wrapper = mountLoginView();

    await wrapper.find("input[type='text']").trigger("keyup.enter");
    await flushPromises();

    expect(mockLogin).toHaveBeenCalled();
  });

  it("triggers login on enter key in password field", async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const wrapper = mountLoginView();

    await wrapper.find("input[type='password']").trigger("keyup.enter");
    await flushPromises();

    expect(mockLogin).toHaveBeenCalled();
  });

  it("disables the submit button while loading", async () => {
    mockLogin.mockReturnValueOnce(new Promise(() => {})); // never resolves
    const wrapper = mountLoginView();

    await wrapper.find(".submit-btn").trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".submit-btn").attributes("disabled")).toBeDefined();
  });

  it("does not call login again while already loading", async () => {
    mockLogin.mockReturnValueOnce(new Promise(() => {})); // never resolves
    const wrapper = mountLoginView();

    await wrapper.find(".submit-btn").trigger("click"); // starts loading
    await wrapper.vm.$nextTick();
    await (wrapper.vm as any).handleLogin(); // call directly, bypasses disabled
    await flushPromises();

    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  // ── Failed login ───────────────────────────────────────────────────────────

  it("shows an error message on invalid credentials", async () => {
    mockLogin.mockRejectedValueOnce(new ApiError(401, "Unauthorized"));
    const wrapper = mountLoginView();

    await wrapper.find(".submit-btn").trigger("click");
    await flushPromises();

    expect(wrapper.find("#error").exists()).toBe(true);
    expect(wrapper.text()).toContain("Invalid username or password.");
  });

  it("shows a generic error message on unexpected errors", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Network error"));
    const wrapper = mountLoginView();

    await wrapper.find(".submit-btn").trigger("click");
    await flushPromises();

    expect(wrapper.find("#error").exists()).toBe(true);
    expect(wrapper.text()).toContain("Something went wrong. Please try again.");
  });

  it("clears the error message on retry", async () => {
    mockLogin.mockRejectedValueOnce(new ApiError(401, "Unauthorized"));
    mockLogin.mockResolvedValueOnce(undefined);
    const wrapper = mountLoginView();

    await wrapper.find(".submit-btn").trigger("click");
    await flushPromises();
    expect(wrapper.find("#error").exists()).toBe(true);

    await wrapper.find(".submit-btn").trigger("click");
    await flushPromises();
    expect(wrapper.find("#error").exists()).toBe(false);
  });

  // ── Password visibility ────────────────────────────────────────────────────

  it("toggles password visibility", async () => {
    const wrapper = mountLoginView();
    expect(wrapper.find("input[type='password']").exists()).toBe(true);

    await wrapper.find(".password-toggle").trigger("click");
    expect(wrapper.find("input[type='text']#password").exists()).toBe(true);

    await wrapper.find(".password-toggle").trigger("click");
    expect(wrapper.find("input[type='password']").exists()).toBe(true);
  });

  // ── Logo filter ────────────────────────────────────────────────────────────

  it("applies dark filter to logo in dark mode", async () => {
    const { isDark, toggleDark } = useDarkMode();
    if (!isDark.value) toggleDark();
    await nextTick();
    const wrapper = mountLoginView();
    expect(wrapper.find(".login-logo").attributes("style")).toContain("invert(0.88)");
  });

  it("applies light filter to logo in light mode", async () => {
    const { isDark, toggleDark } = useDarkMode();
    if (isDark.value) toggleDark();
    await nextTick();
    const wrapper = mountLoginView();
    expect(wrapper.find(".login-logo").attributes("style")).toContain("invert(0.15)");
  });
});