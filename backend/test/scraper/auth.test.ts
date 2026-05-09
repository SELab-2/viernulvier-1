import { describe, expect, it, vi, afterEach } from "vitest";

import { scraperAdminCredentials, fetchScraperJwt } from "@/scraper/auth.js";

describe("scraperAdminCredentials", () => {
  afterEach(() => {
    delete process.env["SCRAPER_ADMIN_USERNAME"];
    delete process.env["SCRAPER_ADMIN_PASSWORD"];
  });

  it("returns defaults when env vars are unset", () => {
    expect(scraperAdminCredentials()).toEqual({
      username: "admin",
      password: "password",
    });
  });

  it("uses env vars when set", () => {
    process.env["SCRAPER_ADMIN_USERNAME"] = "scraper";
    process.env["SCRAPER_ADMIN_PASSWORD"] = "s3cr3t";
    expect(scraperAdminCredentials()).toEqual({
      username: "scraper",
      password: "s3cr3t",
    });
  });
});

describe("fetchScraperJwt", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the token from a successful login response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ token: "jwt-abc" }), { status: 200 }),
    );

    const token = await fetchScraperJwt();
    expect(token).toBe("jwt-abc");
  });

  it("throws when the login response is not ok", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401, statusText: "Unauthorized" }),
    );

    await expect(fetchScraperJwt()).rejects.toThrow("Scraper login failed: 401");
  });
});
