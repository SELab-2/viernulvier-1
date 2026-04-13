import { describe, expect, it } from "vitest";
import { parseNonNegativePriceAmount } from "../../scripts/scraper/event_price.js";

describe("parseNonNegativePriceAmount", () => {
  it("accepts valid numbers and strings", () => {
    expect(parseNonNegativePriceAmount(12.5)).toBe(12.5);
    expect(parseNonNegativePriceAmount("10")).toBe(10);
    expect(parseNonNegativePriceAmount("3,50")).toBe(3.5);
    expect(parseNonNegativePriceAmount(0)).toBe(0);
  });

  it("rejects NaN, negative, and non-numeric", () => {
    expect(parseNonNegativePriceAmount(NaN)).toBeNull();
    expect(parseNonNegativePriceAmount(-1)).toBeNull();
    expect(parseNonNegativePriceAmount("")).toBeNull();
    expect(parseNonNegativePriceAmount(" ")).toBeNull();
    expect(parseNonNegativePriceAmount("abc")).toBeNull();
    expect(parseNonNegativePriceAmount(undefined)).toBeNull();
    expect(parseNonNegativePriceAmount(null)).toBeNull();
    expect(parseNonNegativePriceAmount({})).toBeNull();
  });
});
