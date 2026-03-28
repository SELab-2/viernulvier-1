import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TagType, TagTypeWithMeta } from "@viernulvier/shared/index.js";
import { TagTypeSchema, stringToInt } from "@viernulvier/shared/index.js";
import { parseParams, buildQuery } from "@/routes/helpers.js";
import { z } from "zod";

const TagTypeSelect = `
SELECT id, name
FROM tag_type
`;

const fetchTagTypeByIdQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `${TagTypeSelect} WHERE id = $1`,
    z.tuple([z.int()]),
    TagTypeSchema,
  );

const fetchTagTypeWithMetaByIdQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT id, name, created_at, updated_at, created_by, updated_by
     FROM tag_type WHERE id = $1`,
    z.tuple([z.int()]),
    TagTypeSchema.withMeta(),
  );

const fetchTagTypesQuery = (server: FastifyInstance) =>
  buildQuery(server, `${TagTypeSelect}`, TagTypeSchema);

async function fetchTagType(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<TagType | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const rows = await fetchTagTypeByIdQuery(server)(id);
  return rows[0] ?? null;
}

async function fetchTagTypeWithMeta(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<TagTypeWithMeta | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const rows = await fetchTagTypeWithMetaByIdQuery(server)(id);
  return rows[0] ?? null;
}

async function fetchTagTypes(
  server: FastifyInstance,
  _request: FastifyRequest,
): Promise<TagType[] | null> {
  return await fetchTagTypesQuery(server)();
}

export { fetchTagType, fetchTagTypes, fetchTagTypeWithMeta };
