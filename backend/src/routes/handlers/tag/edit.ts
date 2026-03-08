import type { FastifyInstance, FastifyRequest } from "fastify";
import z from "zod";
import { TagSchema } from "@viernulvier/shared/index.js";
import { parse, getMetadata } from "@/routes/helpers.js";
import { getTagById } from "./fetch.js";

const Shape = TagSchema.shape;

const EditTagSchema = z.object({
  name: Shape.name.optional(),
  type: Shape.type.optional(),
  productions: Shape.productions.optional(),
});

export async function editTag(server: FastifyInstance, request: FastifyRequest) {
  const id = Number((request.params as any).id);
  const body = parse(server, EditTagSchema, request.body);

  const { admin, current_time } = getMetadata();

  await server.pg.query(
    `
    UPDATE tag
    SET
      name=COALESCE($1,name),
      type_id=COALESCE($2,type_id),
      updated_by=$3,
      updated_at=$4
    WHERE id=$5
    `,
    [body.name, body.type, admin, current_time, id],
  );

  if (body.productions) {
    await server.pg.query(`DELETE FROM production_tag WHERE tag_id=$1`, [id]);

    for (const prod of body.productions) {
      await server.pg.query(
        `INSERT INTO production_tag(production_id,tag_id) VALUES ($1,$2)`,
        [prod, id],
      );
    }
  }

  return getTagById(server, id);
}
