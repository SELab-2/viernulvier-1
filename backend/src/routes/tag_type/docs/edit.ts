import { requestSchema, requestById, RequestBody, RequestDescription } from "@/docs/helpers.js";
import { EditTagTypeBodySchema } from "../handlers/edit.js";
import { sharedRequestSchema, returnsTagType } from "./shared.js";

export const editTagTypeDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestBody(EditTagTypeBodySchema),
  returnsTagType,
  new RequestDescription(
    "Partially updates an existing tag type and returns the updated record.",
  ),
);