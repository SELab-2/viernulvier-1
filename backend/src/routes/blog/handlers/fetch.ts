import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Blog, BlogWithMeta } from "@viernulvier/shared/index.js";
import { BlogSchema, serial } from "@viernulvier/shared/index.js";
import { parseParams, buildQuery } from "@/routes/helpers.js";
import z from "zod";

const BlogSelect = `
SELECT
  id,
  name,
  description
FROM blog
`;

const fetchBlogsQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `${BlogSelect} ORDER BY id ASC`,
    BlogSchema,
  );

const fetchBlogByIdQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `${BlogSelect} WHERE id = $1`,
    z.tuple([z.int()]),
    BlogSchema,
  );

const fetchBlogWithMetaByIdQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT id, name, description, created_at, updated_at, created_by, updated_by
     FROM blog WHERE id = $1`,
    z.tuple([z.int()]),
    BlogSchema.withMeta(),
  );

/**
 * Internal helper to fetch a single blog by ID.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param id - The blog ID to fetch.
 * @returns The blog, or `null` if not found or parsing failed.
 */
export async function getBlogById(
  server: FastifyInstance,
  id: number,
): Promise<Blog | null> {
  const rows = await fetchBlogByIdQuery(server)(id);
  return rows[0] ?? null;
}

/**
 * Fetches a single blog by ID.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The blog, or `null` if not found or parsing failed.
 */
export async function fetchBlog(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Blog | null> {
  const { id } = parseParams(request, z.object({ id: serial() }));
  return await getBlogById(server, id);
}

/**
 * Fetches a single blog by ID, including metadata.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The blog with metadata, or `null` if not found or parsing failed.
 */
export async function fetchBlogWithMeta(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<BlogWithMeta | null> {
  const { id } = parseParams(request, z.object({ id: serial() }));
  const rows = await fetchBlogWithMetaByIdQuery(server)(id);
  return rows[0] ?? null;
}

/**
 * Fetches a list of blogs.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param _request - The Fastify request.
 * @returns The list of blogs, or `null` if parsing failed.
 */
export async function fetchBlogs(
  server: FastifyInstance,
  _request: FastifyRequest,
): Promise<Blog[] | null> {
  const rows = await fetchBlogsQuery(server)();
  return rows;
}
