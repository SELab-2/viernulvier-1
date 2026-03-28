import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema, ParseContext } from "@/routes/helpers.js";
import { z } from "zod";

const ReplaceTagBodySchema = TagSchema.pick({
  name: true,
  type: true,
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
     SET name = $1, tag_type = $2, public = $3, updated_by = $4, updated_at = $5
     WHERE id = $6
     RETURNING id, name, tag_type, public`,
    [body.name, body.type, body.public, admin, current_time, id],
  );

  return parseSchema(server, z.array(TagSchema), result.rows, ParseContext.Database)[0] ?? null;
}
