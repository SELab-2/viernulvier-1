import { protectedRequest, requestById, RequestDescription, requestSchema } from "@/docs/helpers.js";
import { returnsProduction, sharedRequestSchema } from "./shared.js";

export const replaceProductionDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsProduction,
  protectedRequest,
  new RequestDescription("Replaces an existing production and returns the replaced record."),
)