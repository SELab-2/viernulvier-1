import type { FastifyInstance } from "fastify";
import { replyHandler } from "@/routes/helpers.js";
import {
  fetchProduction,
  fetchProductionWithMeta,
  fetchProductions,
  createProduction,
  replaceProduction,
  editProduction,
  bulkEditProductions,
  deleteProduction,
  linkTagToProduction,
} from "./handlers/index.js";
import {
  bulkEditProductionsDocs,
  fetchProductionDocs,
  fetchProductionsDocs,
  fetchProductionWithMetaDocs,
  createProductionDocs,
  editProductionDocs,
  deleteProductionDocs,
  linkTagToProductionDocs,
  replaceProductionDocs,
} from "./docs/index.js";

/**
 * Registers production routes on the Fastify instance.
 *
 * @remarks
 * - `GET /api/v1/production` — fetch a list of productions. Optional `limit`, `offset`, `search`, `tags`, `yearMin` / `yearMax`, `from` / `to` are URL query parameters, not request body fields.
 * - `GET /api/v1/production/:id` — fetch a single production by ID.
 * - `GET /api/v1/production/:id/meta` — fetch a single production with metadata by ID. 🔒
 * - `POST /api/v1/production` — create a new production. 🔒
 * - `POST /api/v1/production/:id/tags` — link a tag to a production. 🔒
 * - `PUT /api/v1/production/:id` — replace an existing production. 🔒
 * - `PATCH /api/v1/production/:id` — partially update an existing production. 🔒
 * - `PATCH /api/v1/production/bulk` — bulk update multiple productions. 🔒
 * - `DELETE /api/v1/production/:id` — delete a production by ID. 🔒
 *
 * @param server - The Fastify instance to register routes on.
 */
export default function productionRoutes(server: FastifyInstance) {
  const protect = { preValidation: [server.authorize()] };

  server.get(
    "/api/v1/production",
    { schema: fetchProductionsDocs },
    replyHandler(server, fetchProductions),
  );
  server.get(
    "/api/v1/production/:id",
    { schema: fetchProductionDocs },
    replyHandler(server, fetchProduction),
  );
  server.get(
    "/api/v1/production/:id/meta",
    { ...protect, schema: fetchProductionWithMetaDocs },
    replyHandler(server, fetchProductionWithMeta),
  );
  server.post(
    "/api/v1/production",
    { ...protect, schema: createProductionDocs },
    replyHandler(server, createProduction),
  );
  server.post(
    "/api/v1/production/:id/tags",
    { ...protect, schema: linkTagToProductionDocs },
    replyHandler(server, linkTagToProduction),
  );
  server.put(
    "/api/v1/production/:id",
    { ...protect, schema: replaceProductionDocs },
    replyHandler(server, replaceProduction),
  );
  server.patch(
    "/api/v1/production/:id",
    { ...protect, schema: editProductionDocs },
    replyHandler(server, editProduction),
  );
  server.patch(
    "/api/v1/production/bulk",
    { ...protect, schema: bulkEditProductionsDocs },
    replyHandler(server, bulkEditProductions),
  );
  server.delete(
    "/api/v1/production/:id",
    { ...protect, schema: deleteProductionDocs },
    replyHandler(server, deleteProduction),
  );
}
