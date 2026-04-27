/**
 * @file Auth & Admin API — login/logout and CRUD for admin accounts.
 *
 * Authentication uses an httpOnly `session` cookie set by the server on login.
 * The cookie is sent automatically with every subsequent request thanks to
 * `credentials: "same-origin"` in {@link apiFetch}.
 *
 * Because the cookie is httpOnly, the frontend cannot read it directly. Any
 * call to a protected endpoint will throw an {@link ApiError} with
 * `isUnauthorized === true` when the session has expired.
 *
 * > **Note:** a `GET /api/v1/auth/me` endpoint would allow proper session
 * > checks without knowing the admin's ID. Consider adding it to the backend.
 *
 * Usage:
 * ```ts
 * import { login, logout, ApiError } from "@/services/auth";
 *
 * try {
 *   await login({ username: "admin", password: "secret" });
 * } catch (err) {
 *   if (err instanceof ApiError && err.isUnauthorized) {
 *     showError("Wrong credentials.");
 *   }
 * }
 * ```
 */

import type { Admin, AdminWithMeta } from "@viernulvier/shared";
import { apiFetch, ApiError } from "./api";

// Re-export ApiError so callers only need to import from this module.
export { ApiError };

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/** Payload for the login endpoint. */
export interface LoginCredentials {
  username: string;
  password: string;
}

/** Payload for creating a new admin account. */
export interface CreateAdminInput {
  username: string;
  password: string;
  super: boolean;
  // back-end isn't expecting a profile picture yet, waiting on the media endpoint
  //profile_picture?: string | null;
}

/**
 * Payload for fully replacing an admin account (PUT semantics).
 * All fields are required.
 */
export interface ReplaceAdminInput {
  username: string;
  password: string;
  super: boolean;
  // back-end isn't expecting a profile picture yet, waiting on the media endpoint
  //profile_picture: string | null;
}

/**
 * Payload for partially updating an admin account (PATCH semantics).
 * Only include the fields you want to change.
 */
export type UpdateAdminInput = Partial<ReplaceAdminInput>;

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/**
 * Logs in with the given credentials.
 *
 * On success the server sets an httpOnly `session` cookie that is sent
 * automatically with every subsequent request.
 *
 * @throws {ApiError} 401 — wrong username or password.
 *
 * @example
 * await login({ username: "admin", password: "secret" });
 */
export async function login(credentials: LoginCredentials): Promise<void> {
  await apiFetch("/auth/login", {
    method: "POST",
    body: credentials,
  });
}

/**
 * Logs out the current session. The server clears the `session` cookie.
 *
 * @example
 * await logout();
 */
export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
}

/**
 * Wraps an async operation and calls `onUnauthorized` when the session has
 * expired (HTTP 401). All other errors are re-thrown unchanged.
 *
 * Useful for protecting form submissions or data-loading actions in components
 * without repeating auth-error handling logic everywhere.
 *
 * @param fn             The async operation to execute.
 * @param onUnauthorized Called when the session is missing or expired.
 *                       Typically navigates to the login page.
 * @returns              The result of `fn` when it succeeds.
 * @throws               Any non-401 error thrown by `fn`.
 *
 * @example
 * const production = await withAuth(
 *   () => getProductionWithMeta(42),
 *   () => router.push("/login"),
 * );
 */
export async function withAuth<T>(
  fn: () => Promise<T>,
  onUnauthorized: () => void,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError && err.isUnauthorized) {
      onUnauthorized();
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Admin CRUD
// ---------------------------------------------------------------------------

/**
 * Fetches all admin accounts.
 *
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 403 — authenticated but not a super admin.
 *
 * @example
 * const admins = await getAllAdmins();
 */
export async function getAllAdmins(): Promise<Admin[]> {
  return await apiFetch<Admin[]>("/auth");
}

/**
 * Fetches a single admin by ID.
 *
 * @param id The admin's primary key.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 403 — authenticated but not a super admin.
 * @throws {ApiError} 404 — admin not found.
 *
 * @example
 * const admin = await getAdmin(1);
 * console.log(admin.username);
 */
export async function getAdmin(id: number): Promise<Admin> {
  return await apiFetch<Admin>(`/auth/${id}`);
}

/**
 * Fetches a single admin including audit metadata
 * (`created_at`, `created_by`, `updated_at`, `updated_by`).
 *
 * @param id The admin's primary key.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 403 — authenticated but not a super admin.
 * @throws {ApiError} 404 — admin not found.
 */
export async function getAdminWithMeta(id: number): Promise<AdminWithMeta> {
  return await apiFetch<AdminWithMeta>(`/auth/${id}/meta`);
}

/**
 * Fetches the currently authenticated admin.
 * The session cookie is sent automatically.
 *
 * @throws {ApiError} 401 — unauthenticated or session expired.
 *
 * @example
 * const admin = await getCurrentlyLoggedInAdmin();
 * console.log(admin.username);
 */
export async function getCurrentlyLoggedInAdmin(): Promise<Admin> {
  return await apiFetch<Admin>("/auth/me");
}

/**
 * Fetches the currently authenticated admin including audit metadata
 * (`created_at`, `created_by`, `updated_at`, `updated_by`).
 *
 * @throws {ApiError} 401 — unauthenticated or session expired.
 */
export async function getCurrentlyLoggedInAdminWithMeta(): Promise<AdminWithMeta> {
  return await apiFetch<AdminWithMeta>("/auth/me/meta");
}

/**
 * Creates a new admin account.
 *
 * @param data Username, plain-text password, and optional profile picture URL.
 * @returns    The newly created admin (without the password).
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 403 — authenticated but not a super admin.
 * @throws {ApiError} 409 — username already taken. (note: not implemented in back-end, but great idea)
 *
 * @example
 * const admin = await createAdmin({
 *   username: "maria",
 *   password: "correct-horse-battery-staple",
 *   profile_picture: null,
 * });
 */
export async function createAdmin(data: CreateAdminInput): Promise<Admin> {
  return await apiFetch<Admin>("/auth", { method: "POST", body: data });
}

/**
 * Replaces an admin account entirely (PUT semantics — all fields required).
 *
 * @param id   The admin's primary key.
 * @param data Full replacement payload including the new password.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 403 — authenticated but not a super admin.
 * @throws {ApiError} 404 — admin not found.
 */
export async function replaceAdmin(
  id: number,
  data: ReplaceAdminInput,
): Promise<Admin> {
  return await apiFetch<Admin>(`/auth/${id}`, { method: "PUT", body: data });
}

/**
 * Partially updates an admin account (PATCH semantics — only send changed fields).
 *
 * @param id   The admin's primary key.
 * @param data Only the fields that should change.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 403 — authenticated but not a super admin.
 * @throws {ApiError} 404 — admin not found.
 *
 * @example
 * // Only update the super field
 * await updateAdmin(1, { super: false });
 */
export async function updateAdmin(
  id: number,
  data: UpdateAdminInput,
): Promise<Admin> {
  return await apiFetch<Admin>(`/auth/${id}`, { method: "PATCH", body: data });
}

/**
 * Update your own password.
 *
 * @param password the new password.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — admin not found.
 *
 * @example
 * await updateOwnPassword("hello123");
 */
export async function updateOwnPassword(
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  await apiFetch<Admin>(`/auth/me`, { method: "PATCH", body: { oldPassword, newPassword } });
}

/**
 * Permanently deletes an admin account.
 *
 * @param id The admin's primary key.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 403 — authenticated but not a super admin.
 * @throws {ApiError} 404 — admin not found.
 */
export async function deleteAdmin(id: number): Promise<void> {
  await apiFetch<void>(`/auth/${id}`, { method: "DELETE" });
}
