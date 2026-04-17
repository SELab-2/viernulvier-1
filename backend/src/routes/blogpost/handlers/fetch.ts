import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BlogPost, BlogPostWithMeta } from "@viernulvier/shared/index.js";
import { BlogPostSchema, stringToInt } from "@viernulvier/shared/index.js";
import { parseParams, buildQuery } from "@/routes/helpers.js";
import z from "zod";

const BlogPostSelect = `
SELECT
  id,
  blog,
  title,
  content,
  published_at
FROM blogpost
`;

const fetchBlogPostsQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `${BlogPostSelect} WHERE published_at IS NOT NULL ORDER BY id ASC`,
    BlogPostSchema,
  );

const fetchBlogPostByIdQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `${BlogPostSelect} WHERE id = $1 AND published_at IS NOT NULL`,
    z.tuple([z.int()]),
    BlogPostSchema,
  );

const fetchBlogPostWithMetaByIdQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT id, blog, title, content, published_at, created_at, updated_at, created_by, updated_by
     FROM blogpost WHERE id = $1`,
    z.tuple([z.int()]),
    BlogPostSchema.withMeta(),
  );

/**
 * Internal helper to fetch a single blogpost by ID.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param id - The blogpost ID to fetch.
 * @returns The blogpost, or `null` if not found or parsing failed.
 */
export async function getBlogPostById(
  server: FastifyInstance,
  id: number,
): Promise<BlogPost | null> {
  const rows = await fetchBlogPostByIdQuery(server)(id);
  return rows[0] ?? null;
}

/**
 * Fetches a single blogpost by ID.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The blogpost, or `null` if not found or parsing failed.
 */
export async function fetchBlogPost(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<BlogPost | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  return await getBlogPostById(server, id);
}

/**
 * Fetches a single blogpost by ID, including metadata.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The blogpost with metadata, or `null` if not found or parsing failed.
 */
export async function fetchBlogPostWithMeta(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<BlogPostWithMeta | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const rows = await fetchBlogPostWithMetaByIdQuery(server)(id);
  return rows[0] ?? null;
}

/**
 * Fetches a list of all blogposts.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param _request - The Fastify request.
 * @returns The list of blogposts, or `null` if parsing failed.
 */
export async function fetchBlogPosts(
  server: FastifyInstance,
  _request: FastifyRequest,
): Promise<BlogPost[] | null> {
  const rows = await fetchBlogPostsQuery(server)();
  return rows;
}
