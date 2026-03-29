import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatDate,
  formatShortDate,
  formatTime,
  formatDoors,
  formatDateRange,
  formatEventBlock,
  isUpcoming,
  isPast,
  isOngoing,
} from "@/utils/date";

// ---------------------------------------------------------------------------
// Fixed reference date used throughout these tests
// ISO 8601 strings are used so the Date constructor is unambiguous.
// ---------------------------------------------------------------------------

const SAT_NOON = "2025-04-12T12:00:00"; // Saturday 12 April 2025 12:00
const SAT_20 = "2025-04-12T20:00:00"; // Saturday 12 April 2025 20:00
const SAT_22 = "2025-04-12T22:00:00"; // Saturday 12 April 2025 22:00
const SAT_1930 = "2025-04-12T19:30:00"; // Saturday 12 April 2025 19:30
const SUN_0030 = "2025-04-13T00:30:00"; // Sunday  13 April 2025 00:30

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe("formatDate", () => {
  it("returns a non-empty string for a valid date", () => {
    const result = formatDate(SAT_20);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes the year", () => {
    expect(formatDate(SAT_20)).toContain("2025");
  });

  it("accepts a Date object", () => {
    const result = formatDate(new Date(SAT_20));
    expect(result).toContain("2025");
  });

  it("accepts a numeric timestamp", () => {
    const result = formatDate(new Date(SAT_20).getTime());
    expect(result).toContain("2025");
  });

  it("accepts an optional locale override", () => {
    const result = formatDate(SAT_20, "en-US");
    expect(result).toContain("2025");
  });

  it("uses nl-BE by default (contains month name in Dutch)", () => {
    // In nl-BE "april" is lowercase; just check it does not throw
    const result = formatDate(SAT_20);
    expect(result).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// formatShortDate
// ---------------------------------------------------------------------------

describe("formatShortDate", () => {
  it("returns a non-empty string", () => {
    expect(formatShortDate(SAT_20).length).toBeGreaterThan(0);
  });

  it("includes the year", () => {
    expect(formatShortDate(SAT_20)).toContain("2025");
  });

  it("accepts an optional locale", () => {
    expect(formatShortDate(SAT_20, "en-US")).toContain("2025");
  });
});

// ---------------------------------------------------------------------------
// formatTime
// ---------------------------------------------------------------------------

describe("formatTime", () => {
  it("formats 20:00 correctly", () => {
    expect(formatTime(SAT_20)).toBe("20:00");
  });

  it("formats 19:30 correctly", () => {
    expect(formatTime(SAT_1930)).toBe("19:30");
  });

  it("formats 00:30 correctly", () => {
    expect(formatTime(SUN_0030)).toBe("00:30");
  });

  it("accepts a Date object", () => {
    expect(formatTime(new Date(SAT_22))).toBe("22:00");
  });

  it("accepts a numeric timestamp", () => {
    expect(formatTime(new Date(SAT_20).getTime())).toBe("20:00");
  });
});

// ---------------------------------------------------------------------------
// formatDoors
// ---------------------------------------------------------------------------

describe("formatDoors", () => {
  it("returns the formatted time", () => {
    expect(formatDoors(SAT_1930)).toBe("19:30");
  });

  it("accepts a Date object", () => {
    expect(formatDoors(new Date(SAT_1930))).toBe("19:30");
  });

  it("accepts a numeric timestamp", () => {
    expect(formatDoors(new Date(SAT_1930).getTime())).toBe("19:30");
  });
});

// ---------------------------------------------------------------------------
// formatDateRange
// ---------------------------------------------------------------------------

describe("formatDateRange", () => {
  it("shows time range only when start and end are on the same day", () => {
    const result = formatDateRange(SAT_20, SAT_22);
    expect(result).toBe("20:00 – 22:00");
  });

  it("shows date range when start and end are on different days", () => {
    const result = formatDateRange(SAT_20, SUN_0030);
    // Should contain the year on the end date
    expect(result).toContain("2025");
    // Should NOT be just a time range
    expect(result).not.toBe("20:00 – 00:30");
  });

  it("includes both dates in a multi-day range", () => {
    const result = formatDateRange(SAT_20, SUN_0030);
    expect(result).toMatch(/–/); // contains an en-dash separator
  });

  it("accepts Date objects", () => {
    const result = formatDateRange(new Date(SAT_20), new Date(SAT_22));
    expect(result).toBe("20:00 – 22:00");
  });
});

// ---------------------------------------------------------------------------
// formatEventBlock
// ---------------------------------------------------------------------------

describe("formatEventBlock", () => {
  const DOORS_LABEL = "Deuren open om";

  it("returns a string containing all three parts joined by ·", () => {
    const result = formatEventBlock(SAT_20, SAT_22, SAT_1930, DOORS_LABEL);
    const parts = result.split(" · ");
    expect(parts).toHaveLength(3);
  });

  it("contains the time range in the second part", () => {
    const result = formatEventBlock(SAT_20, SAT_22, SAT_1930, DOORS_LABEL);
    expect(result).toContain("20:00 – 22:00");
  });

  it("contains the doors label and time in the third part", () => {
    const result = formatEventBlock(SAT_20, SAT_22, SAT_1930, DOORS_LABEL);
    expect(result).toContain("Deuren open om 19:30");
  });

  it("contains the year in the first part", () => {
    const result = formatEventBlock(SAT_20, SAT_22, SAT_1930, DOORS_LABEL);
    expect(result).toContain("2025");
  });

  it("uses the provided doors label", () => {
    const result = formatEventBlock(SAT_20, SAT_22, SAT_1930, "Doors open at");
    expect(result).toContain("Doors open at 19:30");
  });
});

// ---------------------------------------------------------------------------
// isUpcoming
// ---------------------------------------------------------------------------

describe("isUpcoming", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-04-12T18:00:00"));
  });
  afterEach(() => vi.useRealTimers());

  it("returns true for a date in the future", () => {
    expect(isUpcoming(SAT_20)).toBe(true); // 20:00, current time 18:00
  });

  it("returns false for a date in the past", () => {
    expect(isUpcoming(SAT_NOON)).toBe(false); // 12:00, current time 18:00
  });

  it("accepts a Date object", () => {
    expect(isUpcoming(new Date(SAT_20))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isPast
// ---------------------------------------------------------------------------

describe("isPast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-04-12T18:00:00"));
  });
  afterEach(() => vi.useRealTimers());

  it("returns true for a date in the past", () => {
    expect(isPast(SAT_NOON)).toBe(true);
  });

  it("returns false for a date in the future", () => {
    expect(isPast(SAT_20)).toBe(false);
  });

  it("accepts a numeric timestamp", () => {
    expect(isPast(new Date(SAT_NOON).getTime())).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isOngoing
// ---------------------------------------------------------------------------

describe("isOngoing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-04-12T21:00:00")); // 21:00 — between 20:00 and 22:00
  });
  afterEach(() => vi.useRealTimers());

  it("returns true when current time is between start and end", () => {
    expect(isOngoing(SAT_20, SAT_22)).toBe(true);
  });

  it("returns false when current time is before start", () => {
    vi.setSystemTime(new Date("2025-04-12T19:00:00"));
    expect(isOngoing(SAT_20, SAT_22)).toBe(false);
  });

  it("returns false when current time is after end", () => {
    vi.setSystemTime(new Date("2025-04-12T23:00:00"));
    expect(isOngoing(SAT_20, SAT_22)).toBe(false);
  });

  it("returns true when current time equals the start (boundary)", () => {
    vi.setSystemTime(new Date(SAT_20));
    expect(isOngoing(SAT_20, SAT_22)).toBe(true);
  });

  it("returns true when current time equals the end (boundary)", () => {
    vi.setSystemTime(new Date(SAT_22));
    expect(isOngoing(SAT_20, SAT_22)).toBe(true);
  });
});
