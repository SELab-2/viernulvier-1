import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import { RouteNames } from "@/router/routeNames";
import { ApiError } from "@/services/auth";
import LoginView from "@/views/admin/LoginView.vue";

const mockLogin = vi.hoisted(() => vi.fn());

vi.mock("@/services/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/auth")>();
  return {
    ...actual,
    login: mockLogin,
  };
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

    await router.push("/nl/admin/login");
    await router.isReady();
  });

  function mountLoginView() {
    return mount(LoginView, {
      global: { plugins: [pinia, router] },
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
    expect(wrapper.find("button").exists()).toBe(true);
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
    await wrapper.find("button").trigger("click");
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockLogin).toHaveBeenCalledWith({ username: "admin", password: "secret" });
  });

  it("redirects to admin after successful login without redirect param", async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const wrapper = mountLoginView();

    await wrapper.find("button").trigger("click");
    await new Promise(resolve => setTimeout(resolve, 0));
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(RouteNames.ADMIN);
  });

  it("redirects to the redirect param after successful login", async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    await router.push("/nl/admin/login?redirect=%2Fnl%2Fadmin%2Fcms");
    const wrapper = mountLoginView();

    await wrapper.find("button").trigger("click");
    await new Promise(resolve => setTimeout(resolve, 0));
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(RouteNames.CMS);
  });

  it("triggers login on enter key in username field", async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const wrapper = mountLoginView();

    await wrapper.find("input[type='text']").trigger("keyup.enter");
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockLogin).toHaveBeenCalled();
  });

  it("triggers login on enter key in password field", async () => {
    mockLogin.mockResolvedValueOnce(undefined);
    const wrapper = mountLoginView();

    await wrapper.find("input[type='password']").trigger("keyup.enter");
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockLogin).toHaveBeenCalled();
  });

  // ── Failed login ───────────────────────────────────────────────────────────

  it("shows an error message on invalid credentials", async () => {
    mockLogin.mockRejectedValueOnce(new ApiError(401, "Unauthorized"));
    const wrapper = mountLoginView();

    await wrapper.find("button").trigger("click");
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(wrapper.text()).toContain("Invalid username or password.");
  });

  it("shows a generic error message on unexpected errors", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Network error"));
    const wrapper = mountLoginView();

    await wrapper.find("button").trigger("click");
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(wrapper.text()).toContain("Something went wrong. Please try again.");
  });

  it("clears the error message on retry", async () => {
    mockLogin.mockRejectedValueOnce(new ApiError(401, "Unauthorized"));
    mockLogin.mockResolvedValueOnce(undefined);
    const wrapper = mountLoginView();

    await wrapper.find("button").trigger("click");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(wrapper.text()).toContain("Invalid username or password.");

    await wrapper.find("button").trigger("click");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(wrapper.text()).not.toContain("Invalid username or password.");
  });
});