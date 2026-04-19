import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema } from "@viernulvier/shared/index.js";
import { getMetadata, parseSchema, buildQuery } from "@/routes/helpers.js";
import z from "zod";

export const CreateTagBodySchema = TagSchema.omit({ id: true, productions: true });

const insertTag = (server: FastifyInstance) =>
  buildQuery(
    server,
    `INSERT INTO tag (old_id, name, tag_type, public, created_by, updated_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $5, $6, $6)
     RETURNING id, old_id, name, tag_type, public`,
    z.tuple([
      CreateTagBodySchema.shape.old_id,
      CreateTagBodySchema.shape.name,
      CreateTagBodySchema.shape.tag_type,
      CreateTagBodySchema.shape.public,
      z.int(),
      z.date(),
    ]),
    TagSchema,
  );

/**
 * Creates a new tag and returns the created record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain a tag body (`name`, `tag_type`, `public`).
 * @returns The created tag, or `null` if the insert failed or parsing failed.
 */
export async function createTag(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {
  const body = parseSchema(server, CreateTagBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);

  const rows = await insertTag(server)(
    body.old_id,
    body.name,
    body.tag_type,
    body.public,
    admin,
    current_time,
  );

  return rows[0] ?? null;
}
