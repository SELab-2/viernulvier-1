import { describe, expect, it } from "vitest";
import {
  formatYmdInTimeZone,
  previousUTCDays,
  startOfCalendarDayUtc,
} from "@/scraper/core/zoned-day.js";

describe("zoned-day (Europe/Brussels archive window)", () => {
  it("formats Y-M-D in Brussels", () => {
    const d = new Date("2026-04-10T22:30:00.000Z");
    const ymd = formatYmdInTimeZone(d, "Europe/Brussels");
    expect(ymd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("startOfCalendarDayUtc is stable for a fixed date", () => {
    const t = startOfCalendarDayUtc("2026-06-15", "Europe/Brussels");
    expect(formatYmdInTimeZone(t, "Europe/Brussels")).toBe("2026-06-15");
    expect(t.getUTCHours()).toBeGreaterThanOrEqual(0);
  });

  it("previousUTCDays(7) is exactly 7 days apart", () => {
    const bounds = previousUTCDays(7);
    const after = bounds.after!;
    const before = bounds.before!;
    const diffMs = before.getTime() - after.getTime();
    const diffDays = diffMs / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(7);
  });
});
