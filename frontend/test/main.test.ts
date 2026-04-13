import { beforeEach, describe, expect, test, vi } from "vitest";

describe("main", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function importMainWithMocks() {
    vi.doMock("@/App.vue", () => ({
      default: { name: "App", template: "<div />" },
    }));
    vi.doMock("@/router", () => ({
      default: { install: vi.fn() },
    }));
    vi.doMock("@/i18n", () => ({
      i18n: { install: vi.fn() },
    }));
    vi.doMock("pinia", () => ({
      createPinia: vi.fn(() => ({ install: vi.fn() })),
    }));

    return await import("@/main");
  }

  test("mounts app to #app", async () => {
    document.body.innerHTML = `<div id="app"></div>`;

    const { app } = await importMainWithMocks();

    expect(document.querySelector("#app")?.innerHTML).not.toBe("");
    app.unmount();
  });

  test("errorHandler logs the error to console", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { app } = await importMainWithMocks();

    const err = new Error("test");

    app.config.errorHandler?.(err, null, "render");

    expect(consoleSpy).toHaveBeenCalledWith(
      "[Vue error]",
      "render",
      err,
      null,
    );

    app.unmount();
    consoleSpy.mockRestore();
  });
});