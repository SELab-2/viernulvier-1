import type { FastifyInstance, FastifyRequest } from "fastify";
import z from "zod";
import { TagTypeSchema } from "@viernulvier/shared/index.js";
import { parse, getMetadata } from "@/routes/helpers.js";

const Shape = TagTypeSchema.shape;

const EditSchema = z.object({
  name: Shape.name.optional(),
});

export async function editTagType(server: FastifyInstance, request: FastifyRequest) {
  const id = Number((request.params as any).id);
  const body = parse(server, EditSchema, request.body);

  const { admin, current_time } = getMetadata();

  const result = await server.pg.query(
    `
    UPDATE tag_type
    SET name=COALESCE($1,name),
        updated_by=$2,
        updated_at=$3
    WHERE id=$4
    RETURNING *
    `,
    [body.name, admin, current_time, id],
  );

  return result.rows[0];
}
