import { describe, test, expect } from "vitest";
import {
  hasOwn,
  getFieldValue,
  getNullableFieldValue,
} from "@/routes/media/handlers/field-utils.js";

describe("hasOwn", () => {
  test("returns true for own properties", () => {
    expect(hasOwn({ a: 1, b: 2 }, "a")).toBe(true);
  });

  test("returns false for non-existent properties", () => {
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(hasOwn({ a: 1 }, "b" as any)).toBe(false);
  });

  test("returns false for inherited properties", () => {
    const obj = Object.create({ inherited: true });
    expect(hasOwn(obj, "inherited")).toBe(false);
  });

  test("returns true for own properties with undefined value", () => {
    expect(hasOwn({ a: undefined }, "a")).toBe(true);
  });
});

describe("getFieldValue", () => {
  test("returns the value of the given key", () => {
    expect(getFieldValue({ x: 42 }, "x")).toBe(42);
  });

  test("returns undefined for a key with undefined value", () => {
    expect(getFieldValue({ x: undefined }, "x")).toBeUndefined();
  });

  test("returns null for a key with null value", () => {
    expect(getFieldValue({ x: null }, "x")).toBeNull();
  });
});

describe("getNullableFieldValue", () => {
  test("returns the value when it is truthy", () => {
    expect(getNullableFieldValue({ x: "hello" }, "x")).toBe("hello");
  });

  test("returns null when value is undefined", () => {
    expect(getNullableFieldValue({ x: undefined }, "x")).toBeNull();
  });

  test("returns null when value is null", () => {
    expect(getNullableFieldValue({ x: null }, "x")).toBeNull();
  });

  test("returns 0 as-is (falsy but not nullish)", () => {
    expect(getNullableFieldValue({ x: 0 }, "x")).toBe(0);
  });

  test("returns empty string as-is (falsy but not nullish)", () => {
    expect(getNullableFieldValue({ x: "" }, "x")).toBe("");
  });

  test("returns false as-is (falsy but not nullish)", () => {
    expect(getNullableFieldValue({ x: false }, "x")).toBe(false);
  });
});