import { describe, expect, test } from "vitest";
import {
  committedYearRangeFromThumbs,
  orderIsoDatePairIfReversed,
} from "@/components/productions/productionsDateFilterModel";

describe("committedYearRangeFromThumbs", () => {
  test("returns null when thumbs span the full min–max range", () => {
    expect(committedYearRangeFromThumbs(2000, 2030, 2000, 2030)).toBeNull();
  });

  test("returns a span when either thumb is off the default endpoints", () => {
    expect(committedYearRangeFromThumbs(2001, 2030, 2000, 2030)).toEqual({
      from: 2001,
      to: 2030,
    });
    expect(committedYearRangeFromThumbs(2000, 2029, 2000, 2030)).toEqual({
      from: 2000,
      to: 2029,
    });
  });
});

describe("orderIsoDatePairIfReversed", () => {
  test("swaps when from is after to", () => {
    expect(
      orderIsoDatePairIfReversed("2025-06-01", "2025-01-01"),
    ).toEqual({ from: "2025-01-01", to: "2025-06-01" });
  });

  test("leaves order when valid or either side empty", () => {
    expect(
      orderIsoDatePairIfReversed("2025-01-01", "2025-06-01"),
    ).toEqual({ from: "2025-01-01", to: "2025-06-01" });
    expect(orderIsoDatePairIfReversed(null, "2025-01-01")).toEqual({
      from: null,
      to: "2025-01-01",
    });
  });
});
