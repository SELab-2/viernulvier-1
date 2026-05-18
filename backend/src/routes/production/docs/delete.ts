import { protectedRequest, requestById, RequestDescription, requestSchema } from "@/docs/helpers.js";
import { sharedRequestSchema, returnsProduction } from "./shared.js";

export const deleteProductionDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsProduction,
  protectedRequest,
  new RequestDescription("Deletes a production by ID and returns the deleted record."),
);