import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema } from "@viernulvier/shared/index.js";
import { languageMap } from "@viernulvier/shared/types/helpers.js";
import { getMetadata, parseSchema, buildQuery } from "@/routes/helpers.js";
import { z } from "zod";

const CreateTagBodySchema = TagSchema.pick({
  name: true,
  public: true,
}).extend({
  type: z.int().nonnegative(),
});

const insertTag = (server: FastifyInstance) =>
  buildQuery(
    server,
    `INSERT INTO tag (name, tag_type, public, created_by, updated_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4, $5, $5)
     RETURNING id, name, tag_type, public`,
    z.tuple([languageMap, z.int(), z.boolean(), z.int(), z.date()]),
    TagSchema,
  );

export async function createTag(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {
  const body = parseSchema(server, CreateTagBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);

  const rows = await insertTag(server)(
    body.name,
    body.type,
    body.public,
    admin,
    current_time,
  );

  return rows[0] ?? null;
}
