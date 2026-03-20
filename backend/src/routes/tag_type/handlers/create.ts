import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TagType } from "@viernulvier/shared/index.js";
import { TagTypeSchema } from "@viernulvier/shared/index.js";
import { getMetadata, parseFirstRow, parseSchema } from "@/routes/helpers.js";

const CreateTagTypeBodySchema = TagTypeSchema.pick({
  name: true,
});

export async function createTagType(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<TagType | null> {

  // Authentication will be enforced once the auth branch is merged
  const body = parseSchema(server, CreateTagTypeBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);

  const result = await server.pg.query<TagType>(
    `INSERT INTO tag_type (name, created_by, updated_by, created_at, updated_at)
     VALUES ($1, $2, $2, $3, $3)
     RETURNING id, name`,
    [body.name, admin, current_time],
  );

  return parseFirstRow(server, TagTypeSchema, result.rows);
}