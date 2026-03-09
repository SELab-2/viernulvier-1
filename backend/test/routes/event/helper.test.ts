import { describe, expect, test } from "vitest";

import { normalizeEventDates, normalizePartialEventDates } from "@/routes/event/handlers/helper.js";

describe("Event Date Normalization Helpers", () => {
	describe("normalizeEventDates", () => {
		test("converts ISO date strings to Date objects", () => {
			const input = {
				starts_at: "2026-01-01T18:00:00.000Z",
				ends_at: "2026-01-01T20:00:00.000Z",
				doors_at: "2026-01-01T17:30:00.000Z",
				production: 10,
				hall: 3,
			};

		const result = normalizeEventDates(input) as Record<string, unknown>;

			expect(result["starts_at"]).toBeInstanceOf(Date);
			expect(result["ends_at"]).toBeInstanceOf(Date);
			expect(result["doors_at"]).toBeInstanceOf(Date);
			expect(result["starts_at"]).toEqual(new Date("2026-01-01T18:00:00.000Z"));
			expect(result["ends_at"]).toEqual(new Date("2026-01-01T20:00:00.000Z"));
			expect(result["doors_at"]).toEqual(new Date("2026-01-01T17:30:00.000Z"));
			expect(result["production"]).toBe(10);
			expect(result["hall"]).toBe(3);
		});

		test("preserves Date objects that are already Date instances", () => {
			const startDate = new Date("2026-01-01T18:00:00.000Z");
			const endDate = new Date("2026-01-01T20:00:00.000Z");
			const doorDate = new Date("2026-01-01T17:30:00.000Z");

			const input = {
				starts_at: startDate,
				ends_at: endDate,
				doors_at: doorDate,
				vendor_id: 42,
			};

		const result = normalizeEventDates(input) as Record<string, unknown>;

		expect(result["starts_at"]).toBeInstanceOf(Date);
		expect(result["ends_at"]).toBeInstanceOf(Date);
		expect(result["doors_at"]).toBeInstanceOf(Date);
		expect(result["starts_at"]).toBe(startDate);
		expect(result["ends_at"]).toBe(endDate);
		expect(result["doors_at"]).toBe(doorDate);
		});

		test("preserves all other fields unchanged", () => {
			const input = {
				starts_at: "2026-01-01T18:00:00.000Z",
				ends_at: "2026-01-01T20:00:00.000Z",
				doors_at: "2026-01-01T17:30:00.000Z",
				production: 10,
				hall: 3,
				vendor_id: 42,
				info: { nl: "Test info" },
				price: [1, 2, 3],
			};

		const result = normalizeEventDates(input) as Record<string, unknown>;

		expect(result["production"]).toBe(10);
		expect(result["hall"]).toBe(3);
		expect(result["vendor_id"]).toBe(42);
		expect(result["info"]).toEqual({ nl: "Test info" });
		expect(result["price"]).toEqual([1, 2, 3]);
		});

		test("returns unchanged value for null or non-object inputs", () => {
			expect(normalizeEventDates(null)).toBeNull();
			expect(normalizeEventDates(undefined)).toBeUndefined();
			expect(normalizeEventDates("string")).toBe("string");
			expect(normalizeEventDates(123)).toBe(123);
		});

		test("returns unchanged value for empty object", () => {
			const input = {};
		const result = normalizeEventDates(input) as Record<string, unknown>;

		expect(result["starts_at"]).toBeInstanceOf(Date);
		expect(result["ends_at"]).toBeInstanceOf(Date);
		expect(result["doors_at"]).toBeInstanceOf(Date);
		});
	});

	describe("normalizePartialEventDates", () => {
		test("converts only provided date string fields to Date objects", () => {
			const input = {
				starts_at: "2026-01-01T18:00:00.000Z",
				production: 20,
			};

		const result = normalizePartialEventDates(input) as Record<string, unknown>;

		expect(result["starts_at"]).toBeInstanceOf(Date);
		expect(result["starts_at"]).toEqual(new Date("2026-01-01T18:00:00.000Z"));
		expect(result["ends_at"]).toBeUndefined();
		expect(result["doors_at"]).toBeUndefined();
		expect(result["production"]).toBe(20);
		});

		test("preserves undefined date fields as undefined", () => {
			const input = {
				starts_at: "2026-01-01T18:00:00.000Z",
				ends_at: undefined,
				doors_at: undefined,
				hall: 5,
			};

		const result = normalizePartialEventDates(input) as Record<string, unknown>;

		expect(result["starts_at"]).toBeInstanceOf(Date);
		expect(result["ends_at"]).toBeUndefined();
		expect(result["doors_at"]).toBeUndefined();
		expect(result["hall"]).toBe(5);
		});

		test("handles partial updates with mixed date types", () => {
			const doorDate = new Date("2026-01-01T17:30:00.000Z");

			const input = {
				starts_at: "2026-02-01T18:00:00.000Z",
				doors_at: doorDate,
				vendor_id: 99,
			};

		const result = normalizePartialEventDates(input) as Record<string, unknown>;

		expect(result["starts_at"]).toBeInstanceOf(Date);
		expect(result["starts_at"]).toEqual(new Date("2026-02-01T18:00:00.000Z"));
		expect(result["doors_at"]).toBeInstanceOf(Date);
		expect(result["doors_at"]).toBe(doorDate);
		expect(result["ends_at"]).toBeUndefined();
		expect(result["vendor_id"]).toBe(99);
		});

		test("preserves all other fields unchanged", () => {
			const input = {
				ends_at: "2026-01-01T20:00:00.000Z",
				production: 15,
				hall: 7,
				info: { nl: "Partial update" },
			};

		const result = normalizePartialEventDates(input) as Record<string, unknown>;

		expect(result["ends_at"]).toBeInstanceOf(Date);
		expect(result["production"]).toBe(15);
		expect(result["hall"]).toBe(7);
		expect(result["info"]).toEqual({ nl: "Partial update" });
		expect(result["starts_at"]).toBeUndefined();
		expect(result["doors_at"]).toBeUndefined();
		});

		test("returns unchanged value for null or non-object inputs", () => {
			expect(normalizePartialEventDates(null)).toBeNull();
			expect(normalizePartialEventDates(undefined)).toBeUndefined();
			expect(normalizePartialEventDates("string")).toBe("string");
			expect(normalizePartialEventDates(123)).toBe(123);
		});

		test("returns unchanged value for empty object", () => {
			const input = {};
		const result = normalizePartialEventDates(input) as Record<string, unknown>;

		expect(result["starts_at"]).toBeUndefined();
		expect(result["ends_at"]).toBeUndefined();
		expect(result["doors_at"]).toBeUndefined();
		});
	});
});
