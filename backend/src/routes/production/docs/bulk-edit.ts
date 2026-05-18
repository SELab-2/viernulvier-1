import { requestSchema, RequestBody, RequestDescription, protectedRequest } from "@/docs/helpers.js";
import { sharedRequestSchema, returnsProductionArray } from "./shared.js";
import { BulkEditProductionsBodySchema } from "../handlers/bulk-edit.js";

export const bulkEditProductionsDocs = requestSchema(
  sharedRequestSchema,
  returnsProductionArray,
  new RequestBody(BulkEditProductionsBodySchema),
  protectedRequest,
  new RequestDescription("Bulk update multiple productions. Returns the updated records."),
);