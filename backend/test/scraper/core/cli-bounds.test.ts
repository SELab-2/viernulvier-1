import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  extractBoundsFromStatsReport,
  getLastRunUpperBound,
  getTodayMidnightUTC,
  pastNDaysBounds,
  resolveScrapeBoundsFromArgs,
} from "@/scraper/core/cli-bounds.js";
import { formatYmdInTimeZone } from "@/scraper/core/zoned-day.js";
import * as fs from "node:fs/promises";
import * as scrapeCoreModule from "@/scraper/core/scrape-stats.js";

vi.mock("node:fs/promises");
vi.mock("@/scraper/core/scrape-stats.js");

describe("cli-bounds", () => {
  describe("extractBoundsFromStatsReport", () => {
    it("extracts before date from valid stats report", () => {
      const report = `Scraper run — started 2026-05-15T21:54:24.335Z, ended 2026-05-15T21:55:22.546Z (58s)
                    Events window: past-seven-days (after=2026-05-07T22:00:00.000Z before=2026-05-14T22:00:00.000Z)

                    Events:
                    Rows seen: 33`;

      const result = extractBoundsFromStatsReport(report);
      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe("2026-05-14T22:00:00.000Z");
    });

    it("returns null for empty report", () => {
      const result = extractBoundsFromStatsReport("");
      expect(result).toBeNull();
    });

    it("returns null for report with only one line", () => {
      const report = "Scraper run — started 2026-05-15T21:54:24.335Z";
      const result = extractBoundsFromStatsReport(report);
      expect(result).toBeNull();
    });

    it("returns null when before date is not found", () => {
      const report = `Scraper run — started 2026-05-15T21:54:24.335Z
Events window: historical (after=— before=—)`;

      const result = extractBoundsFromStatsReport(report);
      expect(result).toBeNull();
    });

    it("returns null for invalid date format", () => {
      const report = `Scraper run — started 2026-05-15T21:54:24.335Z
Events window: past-seven-days (after=invalid before=invalid)`;

      const result = extractBoundsFromStatsReport(report);
      expect(result).toBeNull();
    });

    it("returns null for false dates (month > 12, day > 31)", () => {
      const reportWithMonth13 = `Scraper run — started 2026-05-15T21:54:24.335Z
Events window: past-seven-days (after=2026-05-07T22:00:00.000Z before=2026-13-14T22:00:00.000Z)`;

      const reportWithDay32 = `Scraper run — started 2026-05-15T21:54:24.335Z
Events window: past-seven-days (after=2026-05-07T22:00:00.000Z before=2026-05-32T22:00:00.000Z)`;

      const result1 = extractBoundsFromStatsReport(reportWithMonth13);
      const result2 = extractBoundsFromStatsReport(reportWithDay32);

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it("returns null when second line is empty", () => {
      const report = "Scraper run — started 2026-05-15T21:54:24.335Z\n";

      const result = extractBoundsFromStatsReport(report);
      expect(result).toBeNull();
    });
  });

  describe("pastNDaysBounds", () => {
    it("returns half-open interval with correct span", () => {
      const bounds = pastNDaysBounds(7);

      expect(bounds.after).toBeDefined();
      expect(bounds.before).toBeDefined();
      expect(bounds.after!.getTime()).toBeLessThan(bounds.before!.getTime());

      const diffMs = bounds.before!.getTime() - bounds.after!.getTime();
      const diffDays = diffMs / (24 * 60 * 60 * 1000);
      expect(diffDays).toBe(7);
    });

    it("returns bounds on calendar day boundaries in Brussels TZ", () => {
      const bounds = pastNDaysBounds(5);
      const afterYmd = formatYmdInTimeZone(bounds.after!, "Europe/Brussels");
      const beforeYmd = formatYmdInTimeZone(bounds.before!, "Europe/Brussels");

      // Should be valid date strings
      expect(afterYmd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(beforeYmd).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Should be different days
      expect(afterYmd).not.toBe(beforeYmd);
    });

    it("handles single day correctly", () => {
      const bounds = pastNDaysBounds(1);
      const diffMs = bounds.before!.getTime() - bounds.after!.getTime();
      const diffDays = diffMs / (24 * 60 * 60 * 1000);
      expect(diffDays).toBe(1);
    });

    it("handles large day counts correctly", () => {
      const bounds = pastNDaysBounds(365);
      const diffMs = bounds.before!.getTime() - bounds.after!.getTime();
      const diffDays = diffMs / (24 * 60 * 60 * 1000);
      expect(diffDays).toBe(365);
    });
  });

  describe("getTodayMidnightUtc", () => {
    it("returns today's midnight in Brussels timezone", () => {
      const midnight = getTodayMidnightUTC();

      expect(midnight).toBeInstanceOf(Date);

      // Verify it's midnight (00:00:00) in Brussels timezone
      const ymd = formatYmdInTimeZone(midnight, "Europe/Brussels");
      const nextMidnight = new Date(midnight.getTime() + 24 * 60 * 60 * 1000);
      const nextYmd = formatYmdInTimeZone(nextMidnight, "Europe/Brussels");

      expect(ymd).not.toBe(nextYmd);
    });

    it("returns consistent value when called multiple times", () => {
      const midnight1 = getTodayMidnightUTC();
      const midnight2 = getTodayMidnightUTC();

      // Should be the same time (within a small tolerance in case of race conditions)
      expect(Math.abs(midnight1.getTime() - midnight2.getTime())).toBeLessThan(100);
    });

    it("returns today's date in Brussels timezone", () => {
      const midnight = getTodayMidnightUTC();
      const ymd = formatYmdInTimeZone(midnight, "Europe/Brussels");

      // Format today's date in Brussels timezone
      const now = new Date();
      const todayYmd = formatYmdInTimeZone(now, "Europe/Brussels");

      expect(ymd).toBe(todayYmd);
    });
  });

  describe("getLastRunUpperBound", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("reads stats file and extracts upper bound", async () => {
      const statsPath = "/path/to/stats.log";
      const report = `Scraper run — started 2026-05-15T21:54:24.335Z, ended 2026-05-15T21:55:22.546Z (58s)
                Events window: past-seven-days (after=2026-05-07T22:00:00.000Z before=2026-05-14T22:00:00.000Z)`;

      vi.mocked(scrapeCoreModule.resolveScrapeStatsOutputPath).mockReturnValue(statsPath);
      vi.mocked(fs.readFile).mockResolvedValue(report as never);

      const result = await getLastRunUpperBound();

      expect(result).not.toBeNull();
      expect(result?.toISOString()).toBe("2026-05-14T22:00:00.000Z");
      expect(fs.readFile).toHaveBeenCalledWith(statsPath, "utf8");
    });

    it("returns null when stats file does not exist", async () => {
      const statsPath = "/path/to/nonexistent.log";

      vi.mocked(scrapeCoreModule.resolveScrapeStatsOutputPath).mockReturnValue(statsPath);
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));

      const result = await getLastRunUpperBound();

      expect(result).toBeNull();
    });

    it("returns null when report has invalid format", async () => {
      const statsPath = "/path/to/stats.log";
      const report = "Invalid report format";

      vi.mocked(scrapeCoreModule.resolveScrapeStatsOutputPath).mockReturnValue(statsPath);
      vi.mocked(fs.readFile).mockResolvedValue(report as never);

      const result = await getLastRunUpperBound();

      expect(result).toBeNull();
    });

    it("returns null when extracting date fails", async () => {
      const statsPath = "/path/to/stats.log";
      const report = `Scraper run — started 2026-05-15T21:54:24.335Z
Events window: historical (after=— before=—)`;

      vi.mocked(scrapeCoreModule.resolveScrapeStatsOutputPath).mockReturnValue(statsPath);
      vi.mocked(fs.readFile).mockResolvedValue(report as never);

      const result = await getLastRunUpperBound();

      expect(result).toBeNull();
    });
  });

  describe("resolveScrapeBoundsFromArgs", () => {
    const originalArgv = process.argv;

    beforeEach(() => {
      vi.clearAllMocks();
      process.argv = ["node", "script.js"];
    });

    afterEach(() => {
      process.argv = originalArgv;
      vi.restoreAllMocks();
    });

    it("returns historical mode by default when no args provided", async () => {
      const result = await resolveScrapeBoundsFromArgs();

      expect(result.label).toBe("historical");
      expect(result.bounds.before).toBeInstanceOf(Date);
      expect(result.bounds.after).toBeUndefined();
    });

    it("returns historical mode when explicitly specified", async () => {
      process.argv = ["node", "script.js", "historical"];

      const result = await resolveScrapeBoundsFromArgs();

      expect(result.label).toBe("historical");
      expect(result.bounds.before).toBeInstanceOf(Date);
      expect(result.bounds.after).toBeUndefined();
    });

    it("returns last mode with bounds when last run data is available", async () => {
      process.argv = ["node", "script.js", "last"];
      const lastRunReport = `Scraper run — started 2026-05-15T21:54:24.335Z
Events window: past-seven-days (after=2026-05-07T22:00:00.000Z before=2026-05-14T22:00:00.000Z)`;

      vi.mocked(scrapeCoreModule.resolveScrapeStatsOutputPath).mockReturnValue("/stats.log");
      vi.mocked(fs.readFile).mockResolvedValue(lastRunReport as never);

      const result = await resolveScrapeBoundsFromArgs();

      expect(result.label).toContain("last");
      expect(result.bounds.after).toBeDefined();
      expect(result.bounds.before).toBeInstanceOf(Date);
      expect(result.bounds.after?.toISOString()).toBe("2026-05-14T22:00:00.000Z");
    });

    it("falls back to historical mode when last run data is unavailable", async () => {
      process.argv = ["node", "script.js", "last"];

      vi.mocked(scrapeCoreModule.resolveScrapeStatsOutputPath).mockReturnValue("/nonexistent.log");
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));

      const result = await resolveScrapeBoundsFromArgs();

      expect(result.label).toBe("historical (fallback)");
      expect(result.bounds.before).toBeInstanceOf(Date);
      expect(result.bounds.after).toBeUndefined();
    });

    it("returns days mode with correct bounds for valid day count", async () => {
      process.argv = ["node", "script.js", "days", "7"];

      const result = await resolveScrapeBoundsFromArgs();

      expect(result.label).toBe("past-7-days");
      expect(result.bounds.before).toBeInstanceOf(Date);
      expect(result.bounds.after).toBeInstanceOf(Date);
      // Verify the interval is 7 days
      const diffMs = result.bounds.before!.getTime() - result.bounds.after!.getTime();
      const diffDays = diffMs / (24 * 60 * 60 * 1000);
      expect(diffDays).toBe(7);
    });

    it("returns days mode with correct label for different day counts", async () => {
      process.argv = ["node", "script.js", "days", "30"];

      const result = await resolveScrapeBoundsFromArgs();

      expect(result.label).toBe("past-30-days");
    });

    it("throws error when days mode is missing number argument", async () => {
      process.argv = ["node", "script.js", "days"];

      await expect(resolveScrapeBoundsFromArgs()).rejects.toThrow(
        "days mode requires a number argument",
      );
    });

    it("throws error when days mode has non-numeric argument", async () => {
      process.argv = ["node", "script.js", "days", "invalid"];

      await expect(resolveScrapeBoundsFromArgs()).rejects.toThrow(
        "invalid number of days",
      );
    });

    it("throws error when days mode has zero days", async () => {
      process.argv = ["node", "script.js", "days", "0"];

      await expect(resolveScrapeBoundsFromArgs()).rejects.toThrow(
        "invalid number of days",
      );
    });

    it("throws error when days mode has negative days", async () => {
      process.argv = ["node", "script.js", "days", "-5"];

      await expect(resolveScrapeBoundsFromArgs()).rejects.toThrow(
        "invalid number of days",
      );
    });

    it("throws error for unknown mode", async () => {
      process.argv = ["node", "script.js", "unknown"];

      await expect(resolveScrapeBoundsFromArgs()).rejects.toThrow(
        "unknown mode 'unknown'",
      );
    });
  });
});
