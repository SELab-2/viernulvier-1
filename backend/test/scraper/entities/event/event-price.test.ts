import { describe, expect, it, vi, afterEach } from "vitest";
import { parseNonNegativePriceAmount, scrapeEventPricesForEvent } from "@/scraper/entities/event/event-price.js";

describe("parseNonNegativePriceAmount", () => {
  it("accepts valid numbers and strings", () => {
    expect(parseNonNegativePriceAmount(12.5)).toBe(12.5);
    expect(parseNonNegativePriceAmount("10")).toBe(10);
    expect(parseNonNegativePriceAmount("3,50")).toBe(3.5);
    expect(parseNonNegativePriceAmount(0)).toBe(0);
  });

  it("rejects NaN, Infinity, negative and non-numeric", () => {
    expect(parseNonNegativePriceAmount(NaN)).toBeNull();
    expect(parseNonNegativePriceAmount(Infinity)).toBeNull();
    expect(parseNonNegativePriceAmount(-1)).toBeNull();
    expect(parseNonNegativePriceAmount("")).toBeNull();
    expect(parseNonNegativePriceAmount(" ")).toBeNull();
    expect(parseNonNegativePriceAmount("abc")).toBeNull();
    expect(parseNonNegativePriceAmount("Infinity")).toBeNull();
    expect(parseNonNegativePriceAmount(undefined)).toBeNull();
  });

  it("rejects non-string non-number types", () => {
    expect(parseNonNegativePriceAmount(true)).toBeNull();
    expect(parseNonNegativePriceAmount([])).toBeNull();
    expect(parseNonNegativePriceAmount({})).toBeNull();
  });
});

describe("scrapeEventPricesForEvent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns immediately when priceIds is empty", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    await scrapeEventPricesForEvent([], 1, "auth", "login");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("logs and skips when the price fetch fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("error", { status: 500, statusText: "Internal Server Error" }),
    );

    await expect(
      scrapeEventPricesForEvent([99], 1, "auth", "login"),
    ).resolves.toBeUndefined();
  });

  it("skips price when amount is invalid", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ "@id": "/api/v1/events/prices/1", "@type": "Price", amount: "invalid" }),
        { status: 200 },
      ),
    );

    await expect(
      scrapeEventPricesForEvent([1], 1, "auth", "login"),
    ).resolves.toBeUndefined();
  });

  it("logs when the local price POST fails", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ "@id": "/api/v1/events/prices/1", "@type": "Price", amount: 10 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response("Bad Request", { status: 400 }));

    await expect(
      scrapeEventPricesForEvent([1], 1, "auth", "login"),
    ).resolves.toBeUndefined();
  });

  it("successfully creates a price", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ "@id": "/api/v1/events/prices/1", "@type": "Price", amount: 12.5 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 201 }));

    await scrapeEventPricesForEvent([1], 42, "auth", "login");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});