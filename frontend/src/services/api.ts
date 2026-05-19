/**
 * @file Core API layer — the single fetch wrapper used by all resource services.
 *
 * Every call to the backend goes through {@link apiFetch}. This gives us one
 * place to handle credentials, JSON serialisation, and error normalisation.
 *
 * Usage:
 * ```ts
 * import { apiFetch, ApiError } from "@/services/api";
 *
 * const productions = await apiFetch<Production[]>("/production");
 * ```
 */

/** Root path prepended to every {@link apiFetch} call. */
const API_BASE = "/api/v1";


// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

/**
 * Thrown by {@link apiFetch} whenever the server returns a non-2xx status.
 *
 * Typed convenience getters make it easy to branch on common error codes
 * without comparing magic numbers:
 *
 * ```ts
 * try {
 *   await login({ username: "admin", password: "wrong" });
 * } catch (err) {
 *   if (err instanceof ApiError && err.isUnauthorized) {
 *     showMessage("Wrong username or password.");
 *   }
 * }
 * ```
 */
export class ApiError extends Error {
  /** HTTP status code returned by the server (e.g. 401, 404, 422). */
  readonly status: number;

  /**
   * Per-field validation errors keyed by field name.
   * Only present when the server returns structured field errors (e.g. 422).
   *
   * @example
   * { username: ["Too long", "Already taken"] }
   */
  readonly fields?: Record<string, string[]>;

  /**
   * Validation issue details returned by the backend on 400 responses.
   * Each issue includes a `path` and `message` describing what went wrong.
   */
  readonly details?: { path: (string | number)[]; message: string }[];

  /** Optional machine-readable code from JSON `code` (e.g. production list query errors). */
  readonly code?: string;

  constructor(
    status: number,
    message: string,
    fields?: Record<string, string[]>,
    details?: { path: (string | number)[]; message: string }[],
    code?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
    this.details = details;
    this.code = code;
  }

  /** `true` when the session is missing or expired (HTTP 401). */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** `true` when the session is valid but the user lacks permission (HTTP 403). */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** `true` when the requested resource does not exist (HTTP 404). */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** `true` when a uniqueness constraint was violated (HTTP 409). */
  get isConflict(): boolean {
    return this.status === 409;
  }

  /** `true` when the server rejected the request body as invalid (HTTP 422). */
  get isUnprocessable(): boolean {
    return this.status === 422;
  }
}

// ---------------------------------------------------------------------------
// apiFetch
// ---------------------------------------------------------------------------

/**
 * `RequestInit` extended with a typed `body` that is automatically serialised
 * to JSON. The native `body: BodyInit` is replaced so callers can pass any
 * value without manual `JSON.stringify`.
 *
 * Native `BodyInit` values (`FormData`, `Blob`, `URLSearchParams`,
 * `ArrayBuffer`, `ArrayBufferView`, `ReadableStream`) are forwarded to
 * `fetch` as-is — the browser sets `Content-Type` with the correct
 * multipart boundary, and we do not call `JSON.stringify` on them.
 */
type ApiFetchOptions = Omit<RequestInit, "body"> & {
  /**
   * Request payload — serialised with `JSON.stringify` before sending,
   * unless it is a native `BodyInit` value, in which case it is forwarded
   * unchanged. Omit this field entirely for requests without a body.
   */
  body?: unknown;
};

/**
 * Returns `true` for body values that `fetch` accepts directly and that
 * must NOT be passed through `JSON.stringify`.
 */
function isNativeBodyInit(body: unknown): body is BodyInit {
  return (
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    (typeof ReadableStream !== "undefined" && body instanceof ReadableStream)
  );
}

/**
 * Fetch wrapper for all `/api/v1/*` calls.
 *
 * - Sends cookies with every request (`credentials: "include"`).
 * - Sets `Content-Type: application/json` automatically.
 * - Serialises `options.body` with `JSON.stringify`.
 * - On non-ok responses, parses the error body and throws an {@link ApiError}.
 * - Returns `undefined` (cast to `T`) for `204 No Content` responses.
 *
 * @param path    Path relative to `/api/v1`, e.g. `"/production"` or `"/production/42"`.
 * @param options Standard fetch options plus an optional typed `body`.
 * @returns       The parsed JSON response body cast to `T`.
 * @throws        {@link ApiError} on any non-2xx response.
 *
 * @example
 * // GET
 * const productions = await apiFetch<Production[]>("/production");
 *
 * // POST with body
 * const created = await apiFetch<Production>("/production", {
 *   method: "POST",
 *   body: { title: { nl: "Hamlet" }, artist: { nl: "Shakespeare" }, … },
 * });
 *
 * // DELETE (no response body)
 * await apiFetch<void>("/production/42", { method: "DELETE" });
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;

  const native = body !== undefined && isNativeBodyInit(body);
  const requestBody: BodyInit | undefined =
    body === undefined ? undefined : native ? (body as BodyInit) : JSON.stringify(body);

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      // Only set JSON content-type for JSON-serialised bodies. For native
      // BodyInit (FormData, Blob, …) let the browser set the correct header
      // including any multipart boundary.
      ...(body !== undefined && !native ? { "Content-Type": "application/json" } : {}),
      ...(headers as Record<string, string>),
    },
    body: requestBody,
    ...rest,
  });

  if (!response.ok) {
    let message = response.statusText;
    let fields: Record<string, string[]> | undefined;
    let details: { path: (string | number)[]; message: string }[] | undefined;

    try {
      const errorBody = (await response.json()) as {
        error?: string;
        message?: string;
        fields?: Record<string, string[]>;
        details?: { path: (string | number)[]; message: string }[];
        code?: string;
      };
      message = errorBody.error ?? errorBody.message ?? message;
      fields = errorBody.fields;
      details = errorBody.details;
      const code = errorBody.code;
      throw new ApiError(response.status, message, fields, details, code);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      // JSON parsing failed — keep the statusText as the message.
    }

    throw new ApiError(response.status, message, fields, details);
  }

  // 204 No Content — nothing to parse.
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
