import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag, TagWithMeta } from "@viernulvier/shared/index.js";
import { TagSchema, stringToInt } from "@viernulvier/shared/index.js";
import { parseParams, buildQuery, parseSchema, ParseContext } from "@/routes/helpers.js";
import { z } from "zod";

const TagSelect = `
SELECT id, name, tag_type, public
FROM tag
`;

/** Row shape returned by tag SELECTs before `productions` is merged from `production_tag`. */
const TagDbRowSchema = z.object({
  id: TagSchema.shape.id,
  name: TagSchema.shape.name,
  tag_type: z.int().nonnegative(),
  public: TagSchema.shape.public,
});

const TagDbRowWithMetaSchema = TagDbRowSchema.extend({
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  created_by: z.int().nonnegative(),
  updated_by: z.int().nonnegative(),
});

const TagsListQuerySchema = z.object({
  production: stringToInt.optional(),
  /** When `includeProductions=true`, each tag includes full `productions` id list (default: empty arrays). */
  includeProductions: z.literal("true").optional(),
});

const ProductionTagLinkSchema = z.object({
  tag: z.int(),
  production: z.int(),
});

async function fetchProductionIdsByTagIds(
  server: FastifyInstance,
  tagIds: number[],
): Promise<Map<number, number[]>> {
  if (tagIds.length === 0) {
    return new Map();
  }
  const res = await server.pg.query<{ tag: number; production: number }>(
    `SELECT tag, production FROM production_tag
     WHERE tag = ANY($1::int[])
     ORDER BY tag, production`,
    [tagIds],
  );
  const links = parseSchema(
    server,
    z.array(ProductionTagLinkSchema),
    res.rows,
    ParseContext.Database,
  );
  const map = new Map<number, number[]>();
  for (const { tag, production } of links) {
    const list = map.get(tag) ?? [];
    list.push(production);
    map.set(tag, list);
  }
  return map;
}

function tagsFromDbRows(
  rows: z.infer<typeof TagDbRowSchema>[],
  byTag: Map<number, number[]>,
): Tag[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.tag_type,
    public: row.public,
    productions: byTag.get(row.id) ?? [],
  }));
}

function tagsWithMetaFromDbRows(
  rows: z.infer<typeof TagDbRowWithMetaSchema>[],
  byTag: Map<number, number[]>,
) {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.tag_type,
    public: row.public,
    productions: byTag.get(row.id) ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    updated_by: row.updated_by,
  }));
}

const fetchTagByIdQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `${TagSelect} WHERE id = $1`,
    z.tuple([z.int()]),
    TagDbRowSchema,
  );

const fetchTagVisibleByIdQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `${TagSelect} WHERE id = $1 AND public = true`,
    z.tuple([z.int()]),
    TagDbRowSchema,
  );

const fetchTagWithMetaByIdQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT id, name, tag_type, public, created_at, updated_at, created_by, updated_by
     FROM tag WHERE id = $1`,
    z.tuple([z.int()]),
    TagDbRowWithMetaSchema,
  );

const fetchTagsAllQuery = (server: FastifyInstance) =>
  buildQuery(server, `${TagSelect}`, TagDbRowSchema);

const fetchTagsByProductionQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT DISTINCT t.id, t.name, t.tag_type, public
     FROM tag t
     JOIN production_tag pt ON pt.tag = t.id
     WHERE pt.production = $1`,
    z.tuple([z.int()]),
    TagDbRowSchema,
  );

const fetchTagsVisibleAllQuery = (server: FastifyInstance) =>
  buildQuery(server, `${TagSelect} WHERE public = true`, TagDbRowSchema);

const fetchTagsVisibleByProductionQuery = (server: FastifyInstance) =>
  buildQuery(
    server,
    `SELECT DISTINCT t.id, t.name, t.tag_type, public
     FROM tag t
     JOIN production_tag pt ON pt.tag = t.id
     WHERE pt.production = $1 AND t.public = true`,
    z.tuple([z.int()]),
    TagDbRowSchema,
  );

async function fetchTag(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const rows = await fetchTagByIdQuery(server)(id);
  const row = rows[0];
  if (!row) return null;
  const byTag = await fetchProductionIdsByTagIds(server, [row.id]);
  const merged = tagsFromDbRows([row], byTag);
  return parseSchema(server, TagSchema, merged[0], ParseContext.Database);
}

async function fetchTagVisible(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const rows = await fetchTagVisibleByIdQuery(server)(id);
  const row = rows[0];
  if (!row) return null;
  const byTag = await fetchProductionIdsByTagIds(server, [row.id]);
  const merged = tagsFromDbRows([row], byTag);
  return parseSchema(server, TagSchema, merged[0], ParseContext.Database);
}

async function fetchTagWithMeta(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<TagWithMeta | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const rows = await fetchTagWithMetaByIdQuery(server)(id);
  const row = rows[0];
  if (!row) return null;
  const byTag = await fetchProductionIdsByTagIds(server, [row.id]);
  const merged = tagsWithMetaFromDbRows([row], byTag);
  return parseSchema(server, TagSchema.withMeta(), merged[0], ParseContext.Database);
}

async function fetchTags(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag[] | null> {
  const { production, includeProductions } = parseSchema(
    server,
    TagsListQuerySchema,
    request.query,
  );
  const rows =
    production !== undefined
      ? await fetchTagsByProductionQuery(server)(production)
      : await fetchTagsAllQuery(server)();
  const byTag =
    includeProductions !== undefined
      ? await fetchProductionIdsByTagIds(
        server,
        rows.map((r) => r.id),
      )
      : new Map<number, number[]>();
  const merged = tagsFromDbRows(rows, byTag);
  return parseSchema(server, z.array(TagSchema), merged, ParseContext.Database);
}

async function fetchTagsVisible(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag[] | null> {
  const { production, includeProductions } = parseSchema(
    server,
    TagsListQuerySchema,
    request.query,
  );
  const rows =
    production !== undefined
      ? await fetchTagsVisibleByProductionQuery(server)(production)
      : await fetchTagsVisibleAllQuery(server)();
  const byTag =
    includeProductions !== undefined
      ? await fetchProductionIdsByTagIds(
        server,
        rows.map((r) => r.id),
      )
      : new Map<number, number[]>();
  const merged = tagsFromDbRows(rows, byTag);
  return parseSchema(server, z.array(TagSchema), merged, ParseContext.Database);
}

export { fetchTag, fetchTags, fetchTagWithMeta, fetchTagVisible, fetchTagsVisible };