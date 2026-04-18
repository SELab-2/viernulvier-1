import type { FastifyInstance } from "fastify";

function normalizeTagIds(tagIds: number[]): number[] {
  return [...new Set(tagIds.filter((tagId) => Number.isFinite(tagId) && tagId > 0))];
}

export async function syncProductionTags(
  server: FastifyInstance,
  productionId: number,
  tagIds: number[] | undefined,
): Promise<void> {
  if (tagIds === undefined) {
    return;
  }

  const uniqueTagIds = normalizeTagIds(tagIds);

  await server.pg.query(
    "DELETE FROM production_tag WHERE production = $1",
    [productionId],
  );

  if (uniqueTagIds.length === 0) {
    return;
  }

  await server.pg.query(
    `INSERT INTO production_tag (production, tag)
     SELECT $1, unnest($2::int[])
     ON CONFLICT DO NOTHING`,
    [productionId, uniqueTagIds],
  );
}