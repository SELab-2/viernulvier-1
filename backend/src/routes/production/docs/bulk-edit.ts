import { requestSchema, RequestBody, RequestDescription } from "@/docs/helpers.js";
import { sharedRequestSchema, returnsProductions } from "./shared.js";
import { BulkEditProductionsBodySchema } from "../handlers/bulk-edit.js";

export const bulkEditProductionsDocs = requestSchema(
  sharedRequestSchema,
  returnsProductions,
  new RequestBody(BulkEditProductionsBodySchema),
  new RequestDescription("Bulk update multiple productions. Returns the updated records."),
);