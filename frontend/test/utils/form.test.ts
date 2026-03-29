import { describe, it, expect } from "vitest";
import {
  validateForm,
  getFieldError,
  hasFieldError,
  getFieldErrors,
  errorsToRecord,
} from "@/utils/form";

// ---------------------------------------------------------------------------
// Minimal Zod-like schema stubs
// ---------------------------------------------------------------------------

/** Creates a schema stub that always succeeds with `data` as-is. */
function passingSchema<T>(data: T) {
  return {
    safeParse: (_: unknown) => ({ success: true as const, data }),
  };
}

/** Creates a schema stub that always fails with the given issues. */
function failingSchema(
  issues: Array<{ path: (string | number)[]; message: string }>,
) {
  return {
    safeParse: (_: unknown) => ({
      success: false as const,
      error: { issues },
    }),
  };
}

// ---------------------------------------------------------------------------
// validateForm
// ---------------------------------------------------------------------------

describe("validateForm", () => {
  it("returns { success: true, data } when validation passes", () => {
    const schema = passingSchema({ username: "admin" });
    const result = validateForm(schema, { username: "admin" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ username: "admin" });
    }
  });

  it("returns { success: false, errors } when validation fails", () => {
    const schema = failingSchema([
      { path: ["username"], message: "Too short" },
    ]);
    const result = validateForm(schema, { username: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toBe("Too short");
    }
  });

  it("does not throw — errors are returned as data", () => {
    const schema = failingSchema([{ path: ["x"], message: "err" }]);
    expect(() => validateForm(schema, {})).not.toThrow();
  });

  it("returns all issues from the schema on failure", () => {
    const issues = [
      { path: ["username"], message: "Required" },
      { path: ["password"], message: "Too short" },
    ];
    const schema = failingSchema(issues);
    const result = validateForm(schema, {});
    if (!result.success) {
      expect(result.errors).toHaveLength(2);
    }
  });
});

// ---------------------------------------------------------------------------
// getFieldError
// ---------------------------------------------------------------------------

const sampleErrors = [
  { path: ["username"], message: "Too long" },
  { path: ["title", "nl"], message: "Required" },
  { path: ["title", "en"], message: "Required" },
  { path: ["amount"], message: "Must be positive" },
];

describe("getFieldError", () => {
  it("returns the first error message for a top-level field", () => {
    expect(getFieldError(sampleErrors, "username")).toBe("Too long");
  });

  it("returns the first error message for a nested field (dot notation)", () => {
    expect(getFieldError(sampleErrors, "title.nl")).toBe("Required");
  });

  it("returns null when the field has no error", () => {
    expect(getFieldError(sampleErrors, "email")).toBeNull();
  });

  it("returns null for an empty errors array", () => {
    expect(getFieldError([], "username")).toBeNull();
  });

  it("returns null when the path length does not match", () => {
    // "title" alone should not match "title.nl" or "title.en"
    expect(getFieldError(sampleErrors, "title")).toBeNull();
  });

  it("matches paths with numeric segments", () => {
    const errors = [{ path: ["items", 0, "name"], message: "Required" }];
    expect(getFieldError(errors, "items.0.name")).toBe("Required");
  });
});

// ---------------------------------------------------------------------------
// hasFieldError
// ---------------------------------------------------------------------------

describe("hasFieldError", () => {
  it("returns true when the field has an error", () => {
    expect(hasFieldError(sampleErrors, "username")).toBe(true);
  });

  it("returns false when the field has no error", () => {
    expect(hasFieldError(sampleErrors, "email")).toBe(false);
  });

  it("returns false for an empty errors array", () => {
    expect(hasFieldError([], "username")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getFieldErrors
// ---------------------------------------------------------------------------

describe("getFieldErrors", () => {
  const multiErrors = [
    { path: ["password"], message: "Too short" },
    { path: ["password"], message: "Must contain a number" },
    { path: ["username"], message: "Required" },
  ];

  it("returns all messages for a field with multiple errors", () => {
    expect(getFieldErrors(multiErrors, "password")).toEqual([
      "Too short",
      "Must contain a number",
    ]);
  });

  it("returns a single-item array for a field with one error", () => {
    expect(getFieldErrors(multiErrors, "username")).toEqual(["Required"]);
  });

  it("returns an empty array for a field with no errors", () => {
    expect(getFieldErrors(multiErrors, "email")).toEqual([]);
  });

  it("returns an empty array for an empty errors list", () => {
    expect(getFieldErrors([], "username")).toEqual([]);
  });

  it("matches nested paths correctly", () => {
    const errors = [{ path: ["title", "nl"], message: "Required" }];
    expect(getFieldErrors(errors, "title.nl")).toEqual(["Required"]);
    expect(getFieldErrors(errors, "title.en")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// errorsToRecord
// ---------------------------------------------------------------------------

describe("errorsToRecord", () => {
  it("converts a flat errors array into a Record keyed by field path", () => {
    const errors = [
      { path: ["username"], message: "Too long" },
      { path: ["password"], message: "Required" },
    ];
    expect(errorsToRecord(errors)).toEqual({
      username: "Too long",
      password: "Required",
    });
  });

  it("uses dot notation for nested paths", () => {
    const errors = [{ path: ["title", "nl"], message: "Required" }];
    expect(errorsToRecord(errors)).toEqual({ "title.nl": "Required" });
  });

  it("keeps only the first error per field (last ones are ignored)", () => {
    const errors = [
      { path: ["password"], message: "Too short" },
      { path: ["password"], message: "Must contain a number" },
    ];
    expect(errorsToRecord(errors)).toEqual({ password: "Too short" });
  });

  it("returns an empty record for an empty errors array", () => {
    expect(errorsToRecord([])).toEqual({});
  });

  it("handles root-level errors with an empty path", () => {
    const errors = [{ path: [], message: "Invalid" }];
    expect(errorsToRecord(errors)).toEqual({ "": "Invalid" });
  });
});
