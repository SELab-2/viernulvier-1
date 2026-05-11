/**
 * @file Blogpost API — read-only endpoints for blogposts.
 *
 * A "blog" in this project is a collection of blogposts. This service exposes
 * the public endpoints for fetching individual blogposts by id.
 *
 * Public endpoints (no session required):
 *   - {@link getBlogPost} — fetch one published blogpost by id
 *
 * Usage:
 * ```ts
 * import { getBlogPost } from "@/services/blogposts";
 *
 * const post = await getBlogPost(42);
 * ```
 */

import type { BlogPostWithBackwardsRefs } from "@viernulvier/shared";
import { apiFetch } from "./api";

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
