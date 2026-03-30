import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TagType } from "@viernulvier/shared/index.js";
import { TagTypeSchema, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema, ParseContext } from "@/routes/helpers.js";
import { z } from "zod";

const ReplaceTagTypeBodySchema = TagTypeSchema.pick({
  name: true,
});

export async function replaceTagType(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<TagType | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, ReplaceTagTypeBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);

  const result = await server.pg.query<TagType>(
    `UPDATE tag_type
     SET name = $1, updated_by = $2, updated_at = $3
     WHERE id = $4
     RETURNING id, name`,
    [body.name, admin, current_time, id],
  );

  return parseSchema(server, z.array(TagTypeSchema), result.rows, ParseContext.Database)[0] ?? null;
}
