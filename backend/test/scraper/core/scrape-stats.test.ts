import { describe, expect, it, afterEach, vi } from "vitest";
import { join } from "node:path";

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

import { mkdir, writeFile } from "node:fs/promises";

import {
  createEmptyRunStats,
  formatRunReport,
  resolveScrapeStatsOutputPath,
  scraperVerbose,
  writeRunReportFile,
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

  it("formats elapsed time in minutes and seconds when run takes over a minute", () => {
    const stats = createEmptyRunStats();
    // Backdate startTime by 90 seconds so elapsedMin > 0
    stats.startTime = new Date(Date.now() - 90_000);
    const report = formatRunReport(stats, {
      windowLabel: "test",
      bounds: {},
    });
    expect(report).toMatch(/1m \d+s/);
  });

  it("formats elapsed time in seconds only when run takes under a minute", () => {
    const stats = createEmptyRunStats();
    const report = formatRunReport(stats, {
      windowLabel: "test",
      bounds: {},
    });
    expect(report).toMatch(/\(\d+s\)/);
  });

  it("includes error count when errors > 0", () => {
    const stats = createEmptyRunStats();
    stats.errors = 3;
    const report = formatRunReport(stats, {
      windowLabel: "test",
      bounds: {},
    });
    expect(report).toContain("Errors encountered: 3");
  });

  it("does not include error line when errors is 0", () => {
    const stats = createEmptyRunStats();
    const report = formatRunReport(stats, {
      windowLabel: "test",
      bounds: {},
    });
    expect(report).not.toContain("Errors encountered");
  });

  it("shows — for missing after bound", () => {
    const stats = createEmptyRunStats();
    const report = formatRunReport(stats, {
      windowLabel: "test",
      bounds: { before: new Date("2026-01-02") },
    });
    expect(report).toContain("after=—");
  });

  it("shows — for missing before bound", () => {
    const stats = createEmptyRunStats();
    const report = formatRunReport(stats, {
      windowLabel: "test",
      bounds: { after: new Date("2026-01-01") },
    });
    expect(report).toContain("before=—");
  });

  it("shows — for both bounds when bounds is empty", () => {
    const stats = createEmptyRunStats();
    const report = formatRunReport(stats, {
      windowLabel: "test",
      bounds: {},
    });
    expect(report).toContain("after=—");
    expect(report).toContain("before=—");
  });

  it("uses 0 as fallback when media and crop stats are undefined", () => {
    const stats = createEmptyRunStats();
    const { media_created: _media_created, media_existing: _media_existing, media_skipped: _media_skipped, crop_created: _crop_created, crop_existing: _crop_existing, crop_skipped: _crop_skipped, errors: _errors, ...statsWithoutOptionals } = stats;

    const report = formatRunReport(statsWithoutOptionals as typeof stats, {
      windowLabel: "test",
      bounds: {},
    });

    expect(report).toContain("Created: 0");
    expect(report).toContain("Already in database (reuse): 0");
    expect(report).toContain("Skipped: 0");
    expect(report).not.toContain("Errors encountered");
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

  it('returns true for "true"', () => {
    process.env["SCRAPE_VERBOSE"] = "true";
    expect(scraperVerbose()).toBe(true);
  });

  it('returns true for "yes"', () => {
    process.env["SCRAPE_VERBOSE"] = "yes";
    expect(scraperVerbose()).toBe(true);
  });

  it("returns false for unrecognized values", () => {
    process.env["SCRAPE_VERBOSE"] = "on";
    expect(scraperVerbose()).toBe(false);
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

  it("resolves SCRAPE_STATS_FILE relative to cwd when not absolute", () => {
    process.env["SCRAPE_STATS_FILE"] = "out/stats.log";
    const result = resolveScrapeStatsOutputPath();
    expect(result).toBe(join(process.cwd(), "out", "stats.log"));
  });
});

describe("writeRunReportFile", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("writes the report with a trailing newline to the given path", async () => {
    await writeRunReportFile("my report", "/tmp/out/stats.log");

    expect(mkdir).toHaveBeenCalledWith("/tmp/out", { recursive: true });
    expect(writeFile).toHaveBeenCalledWith("/tmp/out/stats.log", "my report\n", "utf8");
  });
});