import { describe, it, expect } from "vitest";

describe("main", () => {
  it("mounts app to #app", async () => {
    document.body.innerHTML = `<div id="app"></div>`; // mock body

    await import("@/main");

    expect(document.querySelector("#app")?.innerHTML).not.toBe("");
  });
});