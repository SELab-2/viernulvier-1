import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema, ParseContext } from "@/routes/helpers.js";
import { z } from "zod";

const ReplaceTagBodySchema = TagSchema.pick({
  name: true,
  tag_type: true,
  public: true,
});

/**
 * Replaces an existing tag's fields and returns the updated record.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params and a full tag body (`name`, `tag_type`, `public`).
 * @returns The updated tag, or `null` if the update failed or parsing failed.
 */
export async function replaceTag(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, ReplaceTagBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);

  const result = await server.pg.query<Tag>(
    `UPDATE tag
     SET name = $1, tag_type = $2, public = $3, updated_by = $4, updated_at = $5
     WHERE id = $6
     RETURNING id, name, tag_type, public`,
    [body.name, body.tag_type, body.public, admin, current_time, id],
  );

  return parseSchema(server, z.array(TagSchema), result.rows, ParseContext.Database)[0] ?? null;
}
