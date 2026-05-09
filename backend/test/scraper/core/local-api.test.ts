import { describe, expect, it, afterEach } from "vitest";

import { localApiBaseUrl, localApiUrl } from "@/scraper/core/local-api.js";

describe("local-api", () => {
  afterEach(() => {
    delete process.env["VIERNULVIER_LOCAL_API_URL"];
  });

  it("localApiBaseUrl returns default when env is unset", () => {
    expect(localApiBaseUrl()).toBe("http://localhost:3000");
  });

  it("localApiUrl builds absolute URL from path", () => {
    expect(localApiUrl("/api/v1/event")).toBe(
      "http://localhost:3000/api/v1/event",
    );
  });

  it("localApiBaseUrl uses env override without trailing slash", () => {
    process.env["VIERNULVIER_LOCAL_API_URL"] = "http://backend:3000/";
    expect(localApiBaseUrl()).toBe("http://backend:3000");
  });
});
