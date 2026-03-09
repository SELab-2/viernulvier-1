import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { parse, getMetadata } from "@/routes/helpers.js";

import { CreateTagBodySchema } from "./body-schema.js";
import { getTagById } from "./fetch.js";

export async function createTag(
  server: FastifyInstance,
  request: FastifyRequest
): Promise<Tag | null> {

  const body = parse(server, CreateTagBodySchema, request.body);
  const { admin, current_time } = getMetadata();

  const insertResult = await server.pg.query<{ id: number }>(
    `
    INSERT INTO tag (name, type_id, created_by, updated_by, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING id
    `,
    [
      body.name,
      body.type,
      admin,
      admin,
      current_time,
      current_time,
    ]
  );

  const row = insertResult.rows[0];
  if (!row) return null;

  if (body.productions?.length) {

    const values = body.productions
      .map((_, i) => `($1,$${i + 2})`)
      .join(",");

    await server.pg.query(
      `
      INSERT INTO production_tag (tag_id, production_id)
      VALUES ${values}
      `,
      [row.id, ...body.productions]
    );
  }

  return await getTagById(server, row.id);
}