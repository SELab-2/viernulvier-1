import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";
import { fetchHalls, fetchHall, fetchHallWithMeta, createHall, replaceHall, editHall, deleteHall } from "./handlers/index.js";
import { editHallDocs, createHallDocs, fetchHallDocs, fetchHallWithMetaDocs, fetchHallsDocs, replaceHallDocs, deleteHallDocs } from "./docs/index.js";

/**
 * Registers hall routes on the Fastify instance.
 *
 * @remarks
 * - `GET /api/v1/hall` — fetch a list of halls.
 * - `GET /api/v1/hall/:id` — fetch a single hall by ID.
 * - `GET /api/v1/hall/:id/meta` — fetch a single hall with metadata by ID. 🔒
 * - `POST /api/v1/hall` — create a new hall. 🔒
 * - `PUT /api/v1/hall/:id` — replace an existing hall's data. 🔒
 * - `PATCH /api/v1/hall/:id` — partially update an existing hall. 🔒
 * - `DELETE /api/v1/hall/:id` — delete a hall by ID. 🔒
 *
 * @param server - The Fastify instance to register routes on.
 */
export default function hallRoutes(server: FastifyInstance) {
  const protect = { preValidation: [server.authorize()] };

  server.get(
    "/api/v1/hall",
    {schema: fetchHallsDocs},
    replyHandler(server, fetchHalls),
  );
  server.get(
    "/api/v1/hall/:id",
    { schema: fetchHallDocs },
    replyHandler(server, fetchHall),
  );
  server.get(
    "/api/v1/hall/:id/meta",
    { ...protect, schema: fetchHallWithMetaDocs },
    replyHandler(server, fetchHallWithMeta),
  );
  server.post("/api/v1/hall",
    {...protect, schema: createHallDocs},
    replyHandler(server, createHall),
  );
  server.put("/api/v1/hall/:id",
    {...protect, schema: replaceHallDocs},
    replyHandler(server, replaceHall),
  );
  server.patch("/api/v1/hall/:id",
    {...protect, schema: editHallDocs},
    replyHandler(server, editHall),
  );
  server.delete("/api/v1/hall/:id",
    {...protect, schema: deleteHallDocs},
    replyHandler(server, deleteHall),
  );
}
