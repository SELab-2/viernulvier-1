import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema } from "@viernulvier/shared/index.js";
import { getMetadata, parseFirstRow, parseSchema } from "@/routes/helpers.js";

const CreateTagBodySchema = TagSchema.pick({
  name: true,
  type: true,
  public: true,
});

export async function createTag(
  server: FastifyInstance,
  request: FastifyRequest
): Promise<Tag | null> {

  // Authentication will be enforced once auth branch is merged
  const body = parseSchema(server, CreateTagBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);

  const result = await server.pg.query<Tag>(
    `INSERT INTO tag (name, type, public, created_by, updated_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4, $5, $5)
     RETURNING id, name, type_id`,
    [body.name, body.type, body.public, admin, current_time]
  );

  return parseFirstRow(server, TagSchema, result.rows);
}