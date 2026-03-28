import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag, TagWithMeta } from "@viernulvier/shared/index.js";
import { TagSchema, stringToInt } from "@viernulvier/shared/index.js";
import { parseParams, buildQuery, parseSchema } from "@/routes/helpers.js";
import { z } from "zod";

const TagSelect = `
SELECT id, name, tag_type, public
FROM tag
`;

const TagsListQuerySchema = z.object({
  production: stringToInt.optional(),
});

const fetchTagByIdQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `${TagSelect} WHERE id = $1`,
    z.tuple([z.int()]),
    TagSchema,
  );

const fetchTagVisibleByIdQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `${TagSelect} WHERE id = $1 AND public = true`,
    z.tuple([z.int()]),
    TagSchema,
  );

const fetchTagWithMetaByIdQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT id, name, tag_type, public, created_at, updated_at, created_by, updated_by
     FROM tag WHERE id = $1`,
    z.tuple([z.int()]),
    TagSchema.withMeta(),
  );

const fetchTagsAllQuery = (server: FastifyInstance) =>
  buildQuery(server, `${TagSelect}`, TagSchema);

const fetchTagsByProductionQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT t.id, t.name, t.tag_type, public
     FROM tag t
     JOIN production_tag pt ON pt.tag = t.id
     WHERE pt.production = $1`,
    z.tuple([z.int()]),
    TagSchema,
  );

const fetchTagsVisibleAllQuery = (server: FastifyInstance) =>
  buildQuery(server, `${TagSelect} WHERE public = true`, TagSchema);

const fetchTagsVisibleByProductionQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT t.id, t.name, t.tag_type, public
     FROM tag t
     JOIN production_tag pt ON pt.tag = t.id
     WHERE pt.production = $1 AND t.public = true`,
    z.tuple([z.int()]),
    TagSchema,
  );

async function fetchTag(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const rows = await fetchTagByIdQuery(server)(id);
  return rows[0] ?? null;
}

async function fetchTagVisible(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const rows = await fetchTagVisibleByIdQuery(server)(id);
  return rows[0] ?? null;
}

async function fetchTagWithMeta(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<TagWithMeta | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const rows = await fetchTagWithMetaByIdQuery(server)(id);
  return rows[0] ?? null;
}

async function fetchTags(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag[] | null> {
  const { production } = parseSchema(server, TagsListQuerySchema, request.query);
  if (production !== undefined) {
    return await fetchTagsByProductionQuery(server)(production);
  }
  return await fetchTagsAllQuery(server)();
}

async function fetchTagsVisible(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag[] | null> {
  const { production } = parseSchema(server, TagsListQuerySchema, request.query);
  if (production !== undefined) {
    return await fetchTagsVisibleByProductionQuery(server)(production);
  }
  return await fetchTagsVisibleAllQuery(server)();
}

export { fetchTag, fetchTags, fetchTagWithMeta, fetchTagVisible, fetchTagsVisible };