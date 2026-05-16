import { describe, expect, it } from "vitest";
import {
  extractBoundsFromStatsReport,
  pastNDaysBounds,
} from "@/scraper/core/cli-bounds.js";
import { formatYmdInTimeZone } from "@/scraper/core/zoned-day.js";

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
});
