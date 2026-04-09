import { describe, test, expect, vi } from "vitest";

describe("main", () => {
  test("mounts app to #app", async () => {
    // mock body
    document.body.innerHTML = `<div id="app"></div>`;

    await import("@/main");

    expect(document.querySelector("#app")?.innerHTML).not.toBe("");
  });

  test("errorHandler logs the error to console", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { app } = await import("@/main");

    const err = new Error("test");

    app.config.errorHandler?.(err, null, "render");

    expect(consoleSpy).toHaveBeenCalledWith(
      "[Vue error]",
      "render",
      err,
      null,
    );

    consoleSpy.mockRestore();
  });
});