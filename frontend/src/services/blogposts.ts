/**
 * @file Blogpost API — CRUD for blogposts.
 *
 * A "blog" in this project is a collection of blogposts.
 *
 * Public endpoints (no session required):
 *   - {@link getBlogPost} — fetch one published blogpost by id
 *
 * Protected endpoints:
 *   - {@link getAllBlogPosts}, {@link getBlogPostAdmin}, {@link updateBlogPost}
 *
 * Usage:
 * ```ts
 * import { getBlogPost, getAllBlogPosts } from "@/services/blogposts";
 *
 * const posts = await getAllBlogPosts();
 * ```
 */

import type { BlogPost, BlogPostWithBackwardsRefs } from "@viernulvier/shared";
import { apiFetch } from "./api";
import type { LanguageMap } from "@/utils/language-utils";

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/**
 * Payload for partially updating a blogpost (PATCH semantics).
 * Only include the fields that should change.
 */
export interface UpdateBlogPostInput {
  title?: LanguageMap;
  content?: LanguageMap;
  published_at?: string | null;
}

// ---------------------------------------------------------------------------
// Public endpoints
// ---------------------------------------------------------------------------

/**
 * Fetches a single published blogpost by ID (public — no session required).
 *
 * The backend only returns blogposts whose `published_at` is not null, so
 * unpublished drafts will respond with a 404 on this endpoint.
 *
 * @param id The blogpost's primary key.
 * @returns  The blogpost.
 * @throws {ApiError} 404 — blogpost not found or not yet published.
 *
 * @example
 * const post = await getBlogPost(42);
 * console.log(post.title);
 */
export async function getBlogPost(id: number): Promise<BlogPostWithBackwardsRefs> {
  return await apiFetch<BlogPostWithBackwardsRefs>(`/blog/post/${id}`);
}

// ---------------------------------------------------------------------------
// Protected endpoints
// ---------------------------------------------------------------------------

/**
 * Fetches all blogposts (including unpublished drafts).
 *
 * @throws {ApiError} 401 — unauthenticated.
 */
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  return await apiFetch<BlogPost[]>("/blog/post/all");
}

/**
 * Fetches any blogpost by ID, regardless of its `published_at` state.
 *
 * @param id The blogpost's primary key.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — blogpost not found.
 */
export async function getBlogPostAdmin(id: number): Promise<BlogPost> {
  return await apiFetch<BlogPost>(`/blog/post/${id}/all`);
}

/**
 * Partially updates a blogpost (PATCH semantics — only send changed fields).
 *
 * @param id   The blogpost's primary key.
 * @param data Only the fields that should change.
 * @throws {ApiError} 401 — unauthenticated.
 * @throws {ApiError} 404 — blogpost not found.
 *
 * @example
 * // Publish a blogpost
 * await updateBlogPost(3, { published_at: new Date().toISOString() });
 */
export async function updateBlogPost(
  id: number,
  data: UpdateBlogPostInput,
): Promise<BlogPost> {
  return await apiFetch<BlogPost>(`/blog/post/${id}`, { method: "PATCH", body: data });
}