import type { FastifyInstance, FastifyRequest } from "fastify";
import z from "zod";
import { TagTypeSchema } from "@viernulvier/shared/index.js";
import { parse, getMetadata } from "@/routes/helpers.js";

const Shape = TagTypeSchema.shape;

const CreateSchema = z.object({
  name: Shape.name,
});

export async function createTagType(server: FastifyInstance, request: FastifyRequest) {
  const body = parse(server, CreateSchema, request.body);

  const { admin, current_time } = getMetadata();

  const result = await server.pg.query(
    `
    INSERT INTO tag_type(name,created_by,updated_by,created_at,updated_at)
    VALUES ($1,$2,$2,$3,$3)
    RETURNING *
    `,
    [body.name, admin, current_time],
  );

  return result.rows[0];
}
