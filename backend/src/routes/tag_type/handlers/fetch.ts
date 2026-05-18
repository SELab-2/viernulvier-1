import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TagType, TagTypeWithMeta } from "@viernulvier/shared/index.js";
import { TagTypeSchema, serial } from "@viernulvier/shared/index.js";
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

/**
 * Fetches a single tag type by ID.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The tag type, or `null` if not found or parsing failed.
 */
async function fetchTagType(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<TagType | null> {
  const { id } = parseParams(request, z.object({ id: serial() }));
  const rows = await fetchTagTypeByIdQuery(server)(id);
  return rows[0] ?? null;
}

/**
 * Fetches a single tag type by ID, including metadata.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in its params.
 * @returns The tag type with metadata, or `null` if not found or parsing failed.
 */
async function fetchTagTypeWithMeta(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<TagTypeWithMeta | null> {
  const { id } = parseParams(request, z.object({ id: serial() }));
  const rows = await fetchTagTypeWithMetaByIdQuery(server)(id);
  return rows[0] ?? null;
}

/**
 * Fetches all tag types.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param _request - The Fastify request.
 * @returns The list of tag types, or `null` if parsing failed.
 */
async function fetchTagTypes(
  server: FastifyInstance,
  _request: FastifyRequest,
): Promise<TagType[] | null> {
  return await fetchTagTypesQuery(server)();
}

export { fetchTagType, fetchTagTypes, fetchTagTypeWithMeta };
