import type { FastifyInstance, FastifyRequest } from "fastify";
import { parse, getMetadata } from "@/routes/helpers.js";
import { EditTagBodySchema } from "./body-schema.js";

type IdParams = { id: number };

export async function editTag(
  server: FastifyInstance,
  request: FastifyRequest
) {
  const { id } = request.params as IdParams;

  const body = parse(server, EditTagBodySchema, request.body);

  const metadata = getMetadata(request);

  const client = await server.pg.connect();

  try {
    await client.query("BEGIN");

    // update tag
    const result = await client.query(
      `
      UPDATE tag
      SET
        name = $1,
        type = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING id, name, type
      `,
      [body.name, body.type, id]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    // update production relations
    if (body.productions) {
      await client.query(
        `DELETE FROM production_tag WHERE tag_id = $1`,
        [id]
      );

      for (const productionId of body.productions) {
        await client.query(
          `
          INSERT INTO production_tag (production_id, tag_id)
          VALUES ($1, $2)
          `,
          [productionId, id]
        );
      }
    }

    await client.query("COMMIT");

    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
      type: result.rows[0].type,
      productions: body.productions ?? [],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}