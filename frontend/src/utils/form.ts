/**
 * @file Form validation utilities.
 *
 * Thin wrappers around Zod's `safeParse` API that return a consistent result
 * shape and make it easy to display per-field error messages in templates.
 *
 * The helpers use structural typing (duck-typing) so they work with any Zod
 * schema without importing Zod directly — useful when Zod is not listed as an
 * explicit dependency of the frontend package.
 *
 * Usage:
 * ```ts
 * import { validateForm, getFieldError } from "@/utils/form";
 * import { AdminSchema } from "@viernulvier/shared";
 *
 * const result = validateForm(AdminSchema, formData);
 * if (!result.success) {
 *   const usernameError = getFieldError(result.errors, "username");
 * }
 * ```
 */

// ---------------------------------------------------------------------------
// Structural types (compatible with Zod v4)
// ---------------------------------------------------------------------------

/** A single validation issue as returned by Zod. */
interface ValidationIssue {
  /** Dot-notation path to the failing field, e.g. `["title", "nl"]`. */
  path: Array<string | number | symbol>;
  /** Human-readable error message. */
  message: string;
}

/** The object returned by a Zod schema's `safeParse` on failure. */
interface ZodLikeError {
  issues: ValidationIssue[];
}

/** Structural interface satisfied by any Zod schema's `safeParse` return type. */
type SafeParseReturn<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: ZodLikeError };

/** Structural interface satisfied by any Zod schema. */
interface ValidatableSchema<T> {
  safeParse(data: unknown): SafeParseReturn<T>;
}

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

/**
 * Normalised result returned by {@link validateForm}.
 *
 * - On success: `{ success: true, data: T }`.
 * - On failure: `{ success: false, errors: ValidationIssue[] }`.
 */
export type FormValidationResult<T> =
  | { success: true; data: T; errors?: never }
  | { success: false; data?: never; errors: ValidationIssue[] };

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Validates `data` against the given Zod schema and returns a normalised
 * {@link FormValidationResult}.
 *
 * Unlike calling `schema.parse()` directly, this never throws — validation
 * errors are returned as structured data so templates can display them.
 *
 * @param schema Any Zod schema (or any object with a `safeParse` method).
 * @param data   Raw form data to validate (typically the reactive form state).
 * @returns      `{ success: true, data }` or `{ success: false, errors }`.
 *
 * @example
 * const result = validateForm(AdminSchema, { username: "", password: "x" });
 * if (result.success) {
 *   await createAdmin(result.data);
 * } else {
 *   console.log(result.errors);
 * }
 */
export function validateForm<T>(
  schema: ValidatableSchema<T>,
  data: unknown,
): FormValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}

/**
 * Extracts the first error message for a specific field path from a
 * {@link FormValidationResult} errors array.
 *
 * Matches both top-level fields (`"username"`) and nested paths
 * (`"title.nl"` matches path `["title", "nl"]`).
 *
 * @param errors The `errors` array from a failed {@link FormValidationResult}.
 * @param field  Dot-notation field path, e.g. `"username"` or `"title.nl"`.
 * @returns      The first matching error message, or `null` if none.
 *
 * @example
 * const error = getFieldError(result.errors, "username");
 * // → "String must contain at most 32 character(s)"
 */
export function getFieldError(
  errors: ValidationIssue[],
  field: string,
): string | null {
  return getFieldErrors(errors, field)[0] ?? null;
}

/**
 * Returns `true` when the given field has at least one validation error.
 * Convenient for toggling error classes on input elements.
 *
 * @param errors The `errors` array from a failed {@link FormValidationResult}.
 * @param field  Dot-notation field path.
 *
 * @example
 * // In a Vue template:
 * // :class="{ 'input-error': hasFieldError(errors, 'username') }"
 * hasFieldError(errors, "username"); // → true / false
 */
export function hasFieldError(
  errors: ValidationIssue[],
  field: string,
): boolean {
  return getFieldError(errors, field) !== null;
}

/**
 * Collects all error messages for a specific field into an array.
 * Useful when you want to display multiple errors per field.
 *
 * @param errors The `errors` array from a failed {@link FormValidationResult}.
 * @param field  Dot-notation field path.
 * @returns      All matching error messages (empty array if none).
 *
 * @example
 * getFieldErrors(errors, "password");
 * // → ["Too short", "Must contain a number"]
 */
export function getFieldErrors(
  errors: ValidationIssue[],
  field: string,
): string[] {
  const segments = field.split(".");

  return errors
    .filter((issue) => {
      if (issue.path.length !== segments.length) return false;
      return issue.path.every((segment, i) => String(segment) === segments[i]);
    })
    .map((issue) => issue.message);
}

/**
 * Converts a flat errors array into a record keyed by dot-notation field path.
 * Useful for passing a single error map to a form component.
 *
 * @param errors The `errors` array from a failed {@link FormValidationResult}.
 * @returns      `Record<string, string>` — one entry per field, first error only.
 *
 * @example
 * errorsToRecord(result.errors);
 * // → { "username": "Too long", "title.nl": "Required" }
 */
export function errorsToRecord(
  errors: ValidationIssue[],
): Record<string, string> {
  const record: Record<string, string> = {};
  for (const issue of errors) {
    const key = issue.path.map(String).join(".");
    if (!(key in record)) {
      record[key] = issue.message;
    }
  }
  return record;
}
