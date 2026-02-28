import { describe, test, expect } from "vitest";

describe("main", () => {
  test("mounts app to #app", async () => {
    // mock body
    document.body.innerHTML = `<div id="app"></div>`;

    await import("@/main");

    expect(document.querySelector("#app")?.innerHTML).not.toBe("");
  });
});