import { requestSchema, requestById, RequestBody, RequestDescription, protectedRequest } from "@/docs/helpers.js";
import { PartialProductionBodySchema } from "../handlers/body-schema.js";
import { sharedRequestSchema, returnsProduction } from "./shared.js";

export const editProductionDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsProduction,
  new RequestBody(PartialProductionBodySchema),
  protectedRequest,
  new RequestDescription("Partially updates an existing production and returns the updated record."),
);