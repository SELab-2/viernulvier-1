import type { FastifyInstance, FastifyRequest } from "fastify";
import z from "zod";
import { TagSchema } from "@viernulvier/shared/index.js";
import { parse, getMetadata } from "@/routes/helpers.js";
import { getTagById } from "./fetch.js";

const Shape = TagSchema.shape;

const CreateTagSchema = z.object({
  name: Shape.name,
  type: Shape.type,
  productions: Shape.productions.optional(),
});

export async function createTag(server: FastifyInstance, request: FastifyRequest) {
  const body = parse(server, CreateTagSchema, request.body);
  const { admin, current_time } = getMetadata();

  const result = await server.pg.query<{ id: number }>(
    `
    INSERT INTO tag(name,type_id,created_by,updated_by,created_at,updated_at)
    VALUES ($1,$2,$3,$3,$4,$4)
    RETURNING id
    `,
    [body.name, body.type, admin, current_time],
  );

  const tagId = result.rows[0].id;

  if (body.productions) {
    for (const prod of body.productions) {
      await server.pg.query(
        `INSERT INTO production_tag(production_id,tag_id) VALUES ($1,$2)`,
        [prod, tagId],
      );
    }
  }

  return getTagById(server, tagId);
}
