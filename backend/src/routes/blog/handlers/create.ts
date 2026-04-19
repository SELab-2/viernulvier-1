import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Blog } from "@viernulvier/shared/index.js";
import { BlogSchema } from "@viernulvier/shared/index.js";
import { getMetadata, parseSchema, buildQuery } from "@/routes/helpers.js";
import { z } from "zod";

export const CreateBlogBodySchema = BlogSchema.omit({ id: true });

const insertBlog = (server: FastifyInstance) =>
  buildQuery(
    server,
    `INSERT INTO blog (name, description, created_by, updated_by, created_at, updated_at)
     VALUES ($1, $2, $3, $3, $4, $4)
     RETURNING id, name, description`,
    z.tuple([
      z.string(),           // name
      z.string().nullable(), // description
      z.int(),              // admin
      z.date(),             // current_time
    ]),
    BlogSchema,
  );

/**
 * Creates a new blog and returns the created blog.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain a blog body.
 * @returns The created blog, or `null` if the insert failed or parsing failed.
 */
export async function createBlog(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Blog | null> {
  const body = parseSchema(server, CreateBlogBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);

  const rows = await insertBlog(server)(
    body["name"],
    body["description"],
    admin,
    current_time,
  );

  return rows[0] ?? null;
}
