import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "@/i18n";
import ChangePasswordModal from "@/components/admin/ChangePasswordModal.vue";
import { ApiError } from "@/services/auth";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUpdatePassword = vi.hoisted(() => vi.fn());

vi.mock("@/services/auth", () => ({
  updateOwnPassword: mockUpdatePassword,
  ApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function mountModal() {
  return mount(ChangePasswordModal, {
    global: {
      plugins: [i18n],
    },
  });
}

async function fillValidPasswords(wrapper: any) {
  const inputs = wrapper.findAll("input");
  await inputs[0].setValue("oldpassword123");
  await inputs[1].setValue("password123");
  await inputs[2].setValue("password123");
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("ChangePasswordModal", () => {
  beforeEach(() => {
    mockUpdatePassword.mockReset();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders inputs and buttons", () => {
    const wrapper = mountModal();

    expect(wrapper.findAll('input[type="password"]').length).toBe(3);

    expect(wrapper.find("#submit-btn").exists()).toBe(true);
    expect(wrapper.find("#close-btn").exists()).toBe(true);
  });

  it("emits close when cancel button is clicked", async () => {
    const wrapper = mountModal();

    await wrapper.find("#close-btn").trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("does NOT emit close when clicking backdrop", async () => {
    const wrapper = mountModal();

    await wrapper.find(".modal-backdrop").trigger("click");

    expect(wrapper.emitted("close")).toBeFalsy();
  });

  // ── Password toggle ────────────────────────────────────────────────────────

  it("toggles password visibility", async () => {
    const wrapper = mountModal();

    const toggle = wrapper.find(".password-toggle");
    const inputs = wrapper.findAll("input");

    // initially password
    inputs.forEach(input => {
      expect(input.attributes("type")).toBe("password");
    });

    await toggle.trigger("click");

    inputs.forEach(input => {
      expect(input.attributes("type")).toBe("text");
    });

    await toggle.trigger("click");

    inputs.forEach(input => {
      expect(input.attributes("type")).toBe("password");
    });
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it("shows error if password is too short", async () => {
    const wrapper = mountModal();

    const inputs = wrapper.findAll("input");
    await inputs[0].setValue("123");
    await inputs[1].setValue("123");
    await inputs[2].setValue("123");

    await wrapper.find("form").trigger("submit.prevent");

    expect(wrapper.text()).toContain(
      i18n.global.t("admin.changePassword.tooShortError"),
    );
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it("shows error if passwords do not match", async () => {
    const wrapper = mountModal();

    const inputs = wrapper.findAll("input");
    await inputs[0].setValue("oldpassword123");
    await inputs[1].setValue("password123");
    await inputs[2].setValue("different123");

    await wrapper.find("form").trigger("submit.prevent");

    expect(wrapper.text()).toContain(
      i18n.global.t("admin.changePassword.dontMatchError"),
    );
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  // ── Success ────────────────────────────────────────────────────────────────

  it("calls updateOwnPassword and closes on success", async () => {
    mockUpdatePassword.mockResolvedValue(undefined);

    const wrapper = mountModal();

    await fillValidPasswords(wrapper);

    await wrapper.find("form").trigger("submit.prevent");

    expect(mockUpdatePassword).toHaveBeenCalledWith(
      "oldpassword123",
      "password123",
    );
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("disables submit button while loading", async () => {
    let resolvePromise!: () => void;

    mockUpdatePassword.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvePromise = resolve;
        }),
    );

    const wrapper = mountModal();

    await fillValidPasswords(wrapper);

    const submitBtn = wrapper.find("#submit-btn");

    await wrapper.find("form").trigger("submit.prevent");

    expect(submitBtn.attributes("disabled")).toBeDefined();

    resolvePromise();
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it("shows error when old password is incorrect", async () => {
    mockUpdatePassword.mockRejectedValue(
      new ApiError(401, "Invalid credentials"),
    );

    const wrapper = mountModal();

    await fillValidPasswords(wrapper);

    await wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain(
      i18n.global.t("admin.changePassword.wrongOldPasswordError"),
    );
  });

  it("shows ApiError message when API fails", async () => {
    mockUpdatePassword.mockRejectedValue(
      new ApiError(500, "Server error"),
    );

    const wrapper = mountModal();

    await fillValidPasswords(wrapper);

    await wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain(
      i18n.global.t("admin.changePassword.failedToUpdate"),
    );
  });

  it("shows generic error when API fails with unknown error", async () => {
    mockUpdatePassword.mockRejectedValue(new Error("Unknown"));

    const wrapper = mountModal();

    await fillValidPasswords(wrapper);

    await wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain(
      i18n.global.t("admin.changePassword.failedToUpdate"),
    );
  });

  // ── State reset ────────────────────────────────────────────────────────────

  it("clears previous error before new submit", async () => {
    const wrapper = mountModal();

    const inputs = wrapper.findAll("input");

    // First submit (invalid)
    await inputs[0].setValue("123");
    await inputs[1].setValue("123");
    await inputs[2].setValue("123");

    await wrapper.find("form").trigger("submit.prevent");

    expect(wrapper.text()).toContain(
      i18n.global.t("admin.changePassword.tooShortError"),
    );

    // Second submit (valid)
    mockUpdatePassword.mockResolvedValue(undefined);

    await fillValidPasswords(wrapper);

    await wrapper.find("form").trigger("submit.prevent");

    expect(wrapper.text()).not.toContain(
      i18n.global.t("admin.changePassword.tooShortError"),
    );
  });
});