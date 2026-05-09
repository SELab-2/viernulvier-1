import { describe, expect, it, afterEach } from "vitest";

import {
  viernulvierApiOrigin,
  viernulvierApiUrl,
} from "@/scraper/core/viernulvier-api.js";

describe("viernulvier-api", () => {
  afterEach(() => {
    delete process.env["VIERNULVIER_API_ORIGIN"];
  });

  it("viernulvierApiOrigin returns default when env is unset", () => {
    expect(viernulvierApiOrigin()).toBe("https://www.viernulvier.gent");
  });

  it("viernulvierApiUrl builds absolute URL from path", () => {
    expect(viernulvierApiUrl("/api/v1/productions")).toBe(
      "https://www.viernulvier.gent/api/v1/productions",
    );
  });

  it("viernulvierApiOrigin strips trailing slash from env override", () => {
    process.env["VIERNULVIER_API_ORIGIN"] = "https://staging.example.com/";
    expect(viernulvierApiOrigin()).toBe("https://staging.example.com");
  });

  it("prepends slash to paths without leading slash", () => {
    expect(viernulvierApiUrl("api/v1/productions")).toBe("https://www.viernulvier.gent/api/v1/productions");
  });
});
