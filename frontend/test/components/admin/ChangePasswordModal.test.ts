import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import ChangePasswordModal from "@/components/admin/ChangePasswordModal.vue";
import { ApiError } from "@/services/auth";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUpdatePassword = vi.hoisted(() => vi.fn());

vi.mock("@/services/auth", () => ({
  updateOwnPassword: mockUpdatePassword,
  ApiError: class extends Error {},
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function mountModal() {
  return mount(ChangePasswordModal, {
    global: {
      plugins: [i18n],
    },
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("ChangePasswordModal", () => {
  beforeEach(() => {
    mockUpdatePassword.mockReset();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders inputs and buttons", () => {
    const wrapper = mountModal();

    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
    expect(wrapper.findAll('input[type="password"]').length).toBe(2);

    expect(wrapper.find("button[type='submit']").exists()).toBe(true);
    expect(wrapper.find("button[type='button']").exists()).toBe(true);
  });

  it("emits close when cancel button is clicked", async () => {
    const wrapper = mountModal();

    await wrapper.find("button[type='button']").trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("emits close when clicking backdrop", async () => {
    const wrapper = mountModal();

    await wrapper.find(".modal-backdrop").trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it("shows error if password is too short", async () => {
    const wrapper = mountModal();

    const inputs = wrapper.findAll("input");
    await inputs[0].setValue("123");
    await inputs[1].setValue("123");

    await wrapper.find("form").trigger("submit.prevent");

    expect(wrapper.text()).toContain(i18n.global.t("admin.changePassword.tooShortError"));
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it("shows error if passwords do not match", async () => {
    const wrapper = mountModal();

    const inputs = wrapper.findAll("input");
    await inputs[0].setValue("password123");
    await inputs[1].setValue("different123");

    await wrapper.find("form").trigger("submit.prevent");

    expect(wrapper.text()).toContain(i18n.global.t("admin.changePassword.dontMatchError"));
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  // ── Success ────────────────────────────────────────────────────────────────

  it("calls updateOwnPassword and closes on success", async () => {
    mockUpdatePassword.mockResolvedValue(undefined);

    const wrapper = mountModal();

    const inputs = wrapper.findAll("input");
    await inputs[0].setValue("password123");
    await inputs[1].setValue("password123");

    await wrapper.find("form").trigger("submit.prevent");

    expect(mockUpdatePassword).toHaveBeenCalledWith("password123");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("disables submit button while loading", async () => {
    let resolvePromise: () => void;
    mockUpdatePassword.mockImplementation(
      () => new Promise<void>((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const wrapper = mountModal();

    const inputs = wrapper.findAll("input");
    await inputs[0].setValue("password123");
    await inputs[1].setValue("password123");

    const submitBtn = wrapper.find("button[type='submit']");
    await wrapper.find("form").trigger("submit.prevent");

    expect(submitBtn.attributes("disabled")).toBeDefined();

    resolvePromise!();
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it("shows ApiError message when API fails with ApiError", async () => {
    mockUpdatePassword.mockRejectedValue(new ApiError(500, "Server error"));

    const wrapper = mountModal();

    const inputs = wrapper.findAll("input");
    await inputs[0].setValue("password123");
    await inputs[1].setValue("password123");

    await wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain(i18n.global.t("admin.changePassword.failedToUpdate"));
  });

  it("shows generic error when API fails with unknown error", async () => {
    mockUpdatePassword.mockRejectedValue(new Error("Unknown"));

    const wrapper = mountModal();

    const inputs = wrapper.findAll("input");
    await inputs[0].setValue("password123");
    await inputs[1].setValue("password123");

    await wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain(i18n.global.t("admin.changePassword.failedToUpdate"));
  });

  // ── State reset ────────────────────────────────────────────────────────────

  it("clears previous error before new submit", async () => {
    const wrapper = mountModal();

    const inputs = wrapper.findAll("input");

    // First submit (invalid)
    await inputs[0].setValue("123");
    await inputs[1].setValue("123");
    await wrapper.find("form").trigger("submit.prevent");

    expect(wrapper.text()).toContain(i18n.global.t("admin.changePassword.tooShortError"));

    // Second submit (valid)
    mockUpdatePassword.mockResolvedValue(undefined);
    await inputs[0].setValue("password123");
    await inputs[1].setValue("password123");

    await wrapper.find("form").trigger("submit.prevent");

    expect(wrapper.text()).not.toContain(i18n.global.t("admin.changePassword.tooShortError"));
  });
});