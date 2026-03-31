import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema, ParseContext } from "@/routes/helpers.js";
import { z } from "zod";

const ReplaceTagBodySchema = TagSchema.pick({
  old_id: true,
  name: true,
  tag_type: true,
  public: true,
});

export async function replaceTag(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, ReplaceTagBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);

  const result = await server.pg.query<Tag>(
    `UPDATE tag
     SET old_id = $1, name = $2, tag_type = $3, public = $4, updated_by = $5, updated_at = $6
     WHERE id = $7
     RETURNING id, old_id, name, tag_type, public`,
    [body.old_id, body.name, body.tag_type, body.public, admin, current_time, id],
  );

  return parseSchema(server, z.array(TagSchema), result.rows, ParseContext.Database)[0] ?? null;
}
