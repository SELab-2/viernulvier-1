import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";

import { parse, getMetadata } from "@/routes/helpers.js";
import { EditTagBodySchema } from "./body-schema.js";
import { getTagById } from "./fetch.js";

export async function editTag(
  server: FastifyInstance,
  request: FastifyRequest<{ Params: { id: number } }>
): Promise<Tag | null> {

  const body = parse(server, EditTagBodySchema, request.body);
  const { admin, current_time } = getMetadata();

  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (body.name !== undefined) {
    updates.push(`name = $${i++}`);
    values.push(body.name);
  }

  if (body.type !== undefined) {
    updates.push(`type_id = $${i++}`);
    values.push(body.type);
  }

  updates.push(`updated_by = $${i++}`);
  updates.push(`updated_at = $${i++}`);
  values.push(admin, current_time);

  if (updates.length) {

    const result = await server.pg.query(
      `
      UPDATE tag
      SET ${updates.join(", ")}
      WHERE id = $${i}
      RETURNING id
      `,
      [...values, request.params.id]
    );

    if (!result.rows[0]) return null;
  }

  if (body.productions) {

    await server.pg.query(
      `DELETE FROM production_tag WHERE tag_id = $1`,
      [request.params.id]
    );

    if (body.productions.length) {

      const values = body.productions
        .map((_, i) => `($1,$${i + 2})`)
        .join(",");

      await server.pg.query(
        `
        INSERT INTO production_tag (tag_id, production_id)
        VALUES ${values}
        `,
        [request.params.id, ...body.productions]
      );
    }
  }

  return getTagById(server, request.params.id);
}