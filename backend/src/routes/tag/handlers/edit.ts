import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Tag } from "@viernulvier/shared/index.js";
import { TagSchema, stringToInt } from "@viernulvier/shared/index.js";
import { getMetadata, parseParams, parseSchema, ParseContext } from "@/routes/helpers.js";
import { getTagById } from "./fetch.js";
import { z } from "zod";

const EditTagBodySchema = TagSchema.pick({
  old_id: true,
  name: true,
  tag_type: true,
  public: true,
}).partial().extend({
  productions: z.array(z.int()).optional(),
});

/**
 * Partially updates an existing tag and optionally updates its linked productions.
 * All operations are wrapped in a transaction — if any part fails, the entire
 * operation is rolled back.
 *
 * @param server - The Fastify instance, used for database access and logging.
 * @param request - The Fastify request, expected to contain `id` in params and a partial tag body with optional productions array.
 * @returns The updated tag with productions, or `null` if the update failed or parsing failed.
 */
export async function editTag(
  server: FastifyInstance,
  request: FastifyRequest,
): Promise<Tag | null> {
  const { id } = parseParams(request, z.object({ id: stringToInt }));
  const body = parseSchema(server, EditTagBodySchema, request.body);

  const { admin, current_time } = getMetadata(request);

  const client = await server.pg.connect();

  try {
    await client.query("BEGIN");

    // Update tag fields only if provided
    const fieldsToUpdate: string[] = [];
    const valuesToUpdate: unknown[] = [];
    let i = 1;

    if (body.old_id !== undefined) {
      fieldsToUpdate.push(`old_id = $${i++}`);
      valuesToUpdate.push(body.old_id);
    }

    if (body.name !== undefined) {
      fieldsToUpdate.push(`name = $${i++}`);
      valuesToUpdate.push(body.name);
    }

    if (body.tag_type !== undefined) {
      fieldsToUpdate.push(`tag_type = $${i++}`);
      valuesToUpdate.push(body.tag_type);
    }

    if (body.public !== undefined) {
      fieldsToUpdate.push(`public = $${i++}`);
      valuesToUpdate.push(body.public);
    }

    if (fieldsToUpdate.length > 0 || body.productions !== undefined) {
      fieldsToUpdate.push(`updated_by = $${i++}`, `updated_at = $${i++}`);
      valuesToUpdate.push(admin, current_time, id);

      if (fieldsToUpdate.length > 2) {
        // Only run UPDATE if there are actual fields to update (beyond metadata)
        await client.query(
          `UPDATE tag SET ${fieldsToUpdate.join(", ")} WHERE id = $${i}`,
          valuesToUpdate,
        );
      }
    }

    // Update production links if provided
    if (body.productions !== undefined) {
      // Delete old production_tag links
      await client.query(`DELETE FROM production_tag WHERE tag = $1`, [id]);

      // Insert new production_tag links
      for (const productionId of body.productions) {
        await client.query(
          `INSERT INTO production_tag (production, tag, created_by, updated_by, created_at, updated_at)
           VALUES ($1, $2, $3, $3, $4, $4)`,
          [productionId, id, admin, current_time],
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  // Fetch complete tag with productions
  return await getTagById(server, id);
}
