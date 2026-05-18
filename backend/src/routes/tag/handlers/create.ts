import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema } from "@viernulvier/shared/index.js";
import { getMetadata, parseSchema, HttpError, HttpServerError } from "@/routes/helpers.js";
import { getTagById } from "./fetch.js";
import z from "zod";

export const CreateTagBodySchema = TagSchema.omit({ id: true, productions: true }).extend({
  productions: z.array(z.int()).optional(),
});

/**
 * Creates a new tag and optionally links it to productions.
 * All operations are wrapped in a transaction — if any part fails, the entire
 * operation is rolled back and nothing is inserted.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain a tag body with optional productions array.
 * @returns The created tag with productions, or `null` if the insert failed or parsing failed.
 */
export async function createTag(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {
  const body = parseSchema(server, CreateTagBodySchema, request.body);
  const { admin, current_time } = getMetadata(request);
  const productions = body.productions ?? [];

  let tagId: number | undefined;
  const client = await server.pg.connect();

  try {
    await client.query("BEGIN");

    // Insert tag within transaction
    const insertResult = await client.query<Omit<Tag, "productions">>(
      `INSERT INTO tag (old_id, name, tag_type, public, created_by, updated_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $5, $6, $6)
       RETURNING id, old_id, name, tag_type, public`,
      [body.old_id, body.name, body.tag_type, body.public, admin, current_time],
    );

    tagId = insertResult.rows[0]?.id;
    if (!tagId) {
      await client.query("ROLLBACK");
      return null;
    }

    // Insert production_tag links within transaction
    for (const productionId of productions) {
      await client.query(
        `INSERT INTO production_tag (production, tag, created_by, updated_by, created_at, updated_at)
         VALUES ($1, $2, $3, $3, $4, $4)`,
        [productionId, tagId, admin, current_time],
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
  return await getTagById(server, tagId);
}
