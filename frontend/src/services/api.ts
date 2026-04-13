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
const AUTH_TOKEN_STORAGE_KEY = "viernulvier-auth-token";

export function getStoredAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setStoredAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    return;
  }

  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

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

  constructor(
    status: number,
    message: string,
    fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
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
 */
type ApiFetchOptions = Omit<RequestInit, "body"> & {
  /**
   * Request payload — serialised with `JSON.stringify` before sending.
   * Omit this field entirely for requests without a body (GET, DELETE, …).
   */
  body?: unknown;
};

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
  const token = getStoredAuthToken();

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}), // no content header if there's no body
      ...(headers as Record<string, string>),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!response.ok) {
    let message = response.statusText;
    let fields: Record<string, string[]> | undefined;

    try {
      const errorBody = (await response.json()) as {
        error?: string;
        message?: string;
        fields?: Record<string, string[]>;
      };
      message = errorBody.error ?? errorBody.message ?? message;
      fields = errorBody.fields;
    } catch {
      // JSON parsing failed — keep the statusText as the message.
    }

    throw new ApiError(response.status, message, fields);
  }

  // 204 No Content — nothing to parse.
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
