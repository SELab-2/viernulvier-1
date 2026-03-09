import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TagType } from "@viernulvier/shared/index.js";

import { parse, getMetadata } from "@/routes/helpers.js";
import { CreateTagTypeBodySchema } from "./body-schema.js";
import { getTagTypeById } from "./fetch.js";

export async function createTagType(
  server: FastifyInstance,
  request: FastifyRequest
): Promise<TagType | null> {

  const body = parse(server, CreateTagTypeBodySchema, request.body);
  const { admin, current_time } = getMetadata();

  const result = await server.pg.query<{ id: number }>(
    `
    INSERT INTO tag_type (name, visible, created_by, updated_by, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING id
    `,
    [
      body.name,
      body.visible,
      admin,
      admin,
      current_time,
      current_time,
    ]
  );

  const row = result.rows[0];
  if (!row) return null;

  return getTagTypeById(server, row.id);
}