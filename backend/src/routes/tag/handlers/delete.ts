import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema, stringToInt } from "@viernulvier/shared/index.js";
import { parseParams, buildQuery } from "@/routes/helpers.js";
import { z } from "zod";

const deleteTagById = (server: FastifyInstance) =>
  buildQuery(
    server,
    `DELETE FROM tag
     WHERE id = $1
     RETURNING id, name, type_id, public`,
    z.tuple([z.int()]),
    TagSchema,
  );

export async function deleteTag(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const rows = await deleteTagById(server)(id);
  return rows[0] ?? null;
}
