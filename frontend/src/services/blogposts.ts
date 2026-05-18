/**
 * @file Blogpost API — CRUD for blogposts.
 *
 * Public endpoints:
 *   - {@link getBlogPosts} — fetch all blogposts
 *   - {@link getBlogPost}  — fetch a single blogpost by ID
 *
 * Protected endpoints:
 *   - {@link getBlogPostWithMeta} — fetch a single blogpost with audit metadata
 *   - {@link createBlogPost}      — create a new blogpost
 *   - {@link replaceBlogPost}     — fully replace a blogpost (PUT)
 *   - {@link updateBlogPost}      — partially update a blogpost (PATCH)
 *   - {@link deleteBlogPost}      — delete a blogpost
 *
 * Usage:
 * ```ts
 * import { getBlogPosts, updateBlogPost } from "@/services/blogposts";
 *
 * const posts = await getBlogPosts();
 * ```
 */

import type { BlogPostWithBackwardsRefs, BlogPostWithMeta } from "@viernulvier/shared";
import { apiFetch } from "./api";
import type { LanguageMap } from "@/utils/language-utils";

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/** Payload for creating a new blogpost. */
export interface CreateBlogPostInput {
  blog: number;
  title: LanguageMap;
  content: LanguageMap;
  published_at?: string | null;
  productions: number[];
}

/** Payload for fully replacing a blogpost (PUT semantics — all fields required). */
export type ReplaceBlogPostInput = CreateBlogPostInput;

/** Payload for partially updating a blogpost (PATCH semantics — only changed fields). */
export type UpdateBlogPostInput = Partial<CreateBlogPostInput>;

// ---------------------------------------------------------------------------
// Public endpoints
// ---------------------------------------------------------------------------

/** Fetches all blogposts. */
export async function getBlogPosts(): Promise<BlogPostWithBackwardsRefs[]> {
  return await apiFetch<BlogPostWithBackwardsRefs[]>("/blog/post");
}

/**
 * Fetches a single blogpost by ID.
 *
 * @param id The blogpost's primary key.
 * @throws {ApiError} 404 — blogpost not found.
 */
export async function getBlogPost(id: number): Promise<BlogPostWithBackwardsRefs> {
  return await apiFetch<BlogPostWithBackwardsRefs>(`/blog/post/${id}`);
}

// ---------------------------------------------------------------------------
// Protected endpoints
// ---------------------------------------------------------------------------

/**
 * Fetches a single blogpost including audit metadata.
 *
 * @param id The blogpost's primary key.
 * @throws {ApiError} 404 — blogpost not found.
 */
export async function getBlogPostWithMeta(id: number): Promise<BlogPostWithMeta> {
  return await apiFetch<BlogPostWithMeta>(`/blog/post/${id}/meta`);
}

/**
 * Creates a new blogpost.
 *
 * @param data The blogpost payload.
 * @throws {ApiError} 422 — validation failed.
 */
export async function createBlogPost(data: CreateBlogPostInput): Promise<BlogPostWithBackwardsRefs> {
  return await apiFetch<BlogPostWithBackwardsRefs>("/blog/post", { method: "POST", body: data });
}

/**
 * Fully replaces a blogpost (PUT semantics — all fields required).
 *
 * @param id   The blogpost's primary key.
 * @param data Full replacement payload.
 * @throws {ApiError} 404 — blogpost not found.
 */
export async function replaceBlogPost(id: number, data: ReplaceBlogPostInput): Promise<BlogPostWithBackwardsRefs> {
  return await apiFetch<BlogPostWithBackwardsRefs>(`/blog/post/${id}`, { method: "PUT", body: data });
}

/**
 * Partially updates a blogpost (PATCH semantics — only send changed fields).
 *
 * @param id   The blogpost's primary key.
 * @param data Only the fields that should change.
 * @throws {ApiError} 404 — blogpost not found.
 *
 * @example
 * await updateBlogPost(3, { published_at: new Date().toISOString() });
 */
export async function updateBlogPost(id: number, data: UpdateBlogPostInput): Promise<BlogPostWithBackwardsRefs> {
  return await apiFetch<BlogPostWithBackwardsRefs>(`/blog/post/${id}`, { method: "PATCH", body: data });
}

/**
 * Permanently deletes a blogpost.
 *
 * @param id The blogpost's primary key.
 * @throws {ApiError} 404 — blogpost not found.
 */
export async function deleteBlogPost(id: number): Promise<void> {
  await apiFetch<BlogPostWithBackwardsRefs>(`/blog/post/${id}`, { method: "DELETE" });
}