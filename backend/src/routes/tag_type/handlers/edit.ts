import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TagType } from "@viernulvier/shared/index.js";

import { parse, getMetadata } from "@/routes/helpers.js";
import { EditTagTypeBodySchema } from "./body-schema.js";
import { getTagTypeById } from "./fetch.js";

export async function editTagType(
  server: FastifyInstance,
  request: FastifyRequest
): Promise<TagType | null> {

  const { id } = request.params as { id: number };

  const body = parse(server, EditTagTypeBodySchema, request.body);
  const { admin, current_time } = getMetadata();

  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (body.name !== undefined) {
    updates.push(`name = $${i++}`);
    values.push(body.name);
  }

  if (body.visible !== undefined) {
    updates.push(`visible = $${i++}`);
    values.push(body.visible);
  }

  updates.push(`updated_by = $${i++}`);
  updates.push(`updated_at = $${i++}`);
  values.push(admin, current_time);

  const result = await server.pg.query(
    `
    UPDATE tag_type
    SET ${updates.join(", ")}
    WHERE id = $${i}
    RETURNING id
    `,
    [...values, id]
  );

  if (!result.rows[0]) return null;

  return await getTagTypeById(server, id);
}