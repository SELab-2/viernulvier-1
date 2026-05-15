import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema, HttpError, HttpServerError } from "@/routes/helpers.js";
import { getTagById } from "./fetch.js";
import { z } from "zod";

const ReplaceTagBodySchema = TagSchema.pick({
  old_id: true,
  name: true,
  tag_type: true,
  public: true,
}).extend({
  productions: z.array(z.int()).optional(),
});

/**
 * Replaces an existing tag's fields and updates its linked productions.
 * All operations are wrapped in a transaction — if any part fails, the entire
 * operation is rolled back and nothing is persisted.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params and a full tag body with optional productions array.
 * @returns The updated tag with productions, or `null` if the update failed or parsing failed.
 */
export async function replaceTag(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, ReplaceTagBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);
  const productions = body.productions ?? [];

  const client = await server.pg.connect();

  try {
    await client.query("BEGIN");

    // Update tag fields within transaction
    await client.query(
      `UPDATE tag
       SET old_id = $1, name = $2, tag_type = $3, public = $4, updated_by = $5, updated_at = $6
       WHERE id = $7`,
      [body.old_id, body.name, body.tag_type, body.public, admin, current_time, id],
    );

    // Delete old production_tag links
    await client.query(`DELETE FROM production_tag WHERE tag = $1`, [id]);

    // Insert new production_tag links
    for (const productionId of productions) {
      await client.query(
        `INSERT INTO production_tag (production, tag, created_by, updated_by, created_at, updated_at)
         VALUES ($1, $2, $3, $3, $4, $4)`,
        [productionId, id, admin, current_time],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    server.log.error(error);
    throw new HttpError(HttpServerError.InternalServerError, "Internal server error");
  } finally {
    client.release();
  }

  // Fetch complete tag with productions
  return await getTagById(server, id);
}
