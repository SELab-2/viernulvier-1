import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TagType } from "@viernulvier/shared/index.js";
import { TagTypeSchema } from "@viernulvier/shared/index.js";
import { languageMap } from "@viernulvier/shared/types/helpers.js";
import { getMetadata, parseSchema, buildQuery } from "@/routes/helpers.js";
import { z } from "zod";

const CreateTagTypeBodySchema = TagTypeSchema.pick({
  name: true,
});

const insertTagType = (server: FastifyInstance) =>
  buildQuery(
    server,
    `INSERT INTO tag_type (name, created_by, updated_by, created_at, updated_at)
     VALUES ($1, $2, $2, $3, $3)
     RETURNING id, name`,
    z.tuple([languageMap, z.int(), z.date()]),
    TagTypeSchema,
  );

/**
 * Creates a new tag type and returns the created record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain a localized `name` map in the body.
 * @returns The created tag type, or `null` if the insert failed or parsing failed.
 */
export async function createTagType(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<TagType | null> {
  const body = parseSchema(server, CreateTagTypeBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);

  const rows = await insertTagType(server)(body.name, admin, current_time);

  return rows[0] ?? null;
}
