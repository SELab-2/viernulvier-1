import { describe, expect, it } from "vitest";
import { toIsoStringFromLocalInput, toLocalDateTimeInput } from "@/services/cms";

describe("cms date helpers", () => {
  it("formats local date input and handles invalid values", () => {
    expect(toLocalDateTimeInput("not-a-date")).toBe("");

    const output = toLocalDateTimeInput("2026-01-01T12:34:00.000Z");
    expect(output).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("converts local datetime input to ISO string", () => {
    const input = "2026-04-13T10:30";
    expect(toIsoStringFromLocalInput(input)).toBe(new Date(input).toISOString());
  });
});
