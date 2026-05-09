import { describe, expect, it, afterEach } from "vitest";

import {
  createEmptyRunStats,
  formatRunReport,
  resolveScrapeStatsOutputPath,
  scraperVerbose,
} from "@/scraper/core/scrape-stats.js";

describe("createEmptyRunStats", () => {
  it("returns zeroed counters", () => {
    const stats = createEmptyRunStats();
    expect(stats.events.seen).toBe(0);
    expect(stats.events.imported).toBe(0);
    expect(stats.halls.created).toBe(0);
    expect(stats.productions.created).toBe(0);
    expect(stats.tags.tagsCreated).toBe(0);
    expect(stats.media_created).toBe(0);
    expect(stats.crop_created).toBe(0);
    expect(stats.errors).toBe(0);
    expect(stats.startTime).toBeInstanceOf(Date);
  });
});

describe("formatRunReport", () => {
  it("includes window label and key section headers", () => {
    const stats = createEmptyRunStats();
    const report = formatRunReport(stats, {
      windowLabel: "yesterday",
      bounds: { after: new Date("2026-01-01"), before: new Date("2026-01-02") },
    });
    expect(report).toContain("Events window: yesterday");
    expect(report).toContain("Events:");
    expect(report).toContain("Productions");
    expect(report).toContain("Halls");
    expect(report).toContain("Images");
    expect(report).toContain("Crops");
  });
});

describe("scraperVerbose", () => {
  afterEach(() => {
    delete process.env["SCRAPE_VERBOSE"];
  });

  it("returns false when unset", () => {
    expect(scraperVerbose()).toBe(false);
  });

  it('returns true for "1"', () => {
    process.env["SCRAPE_VERBOSE"] = "1";
    expect(scraperVerbose()).toBe(true);
  });
});

describe("resolveScrapeStatsOutputPath", () => {
  afterEach(() => {
    delete process.env["SCRAPE_STATS_FILE"];
  });

  it("returns a path ending in last-scrape-stats.log by default", () => {
    expect(resolveScrapeStatsOutputPath()).toMatch(/last-scrape-stats\.log$/);
  });

  it("uses SCRAPE_STATS_FILE when set to an absolute path", () => {
    process.env["SCRAPE_STATS_FILE"] = "/tmp/my-stats.log";
    expect(resolveScrapeStatsOutputPath()).toBe("/tmp/my-stats.log");
  });
});
