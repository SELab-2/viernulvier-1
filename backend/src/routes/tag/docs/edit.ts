import { RequestBody, requestById, RequestDescription, requestSchema } from "@/docs/helpers.js";
import { EditTagBodySchema } from "../handlers/edit.js";
import { sharedRequestSchema, returnsTag } from "./shared.js";

export const editTagDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestBody(EditTagBodySchema),
  returnsTag,
  new RequestDescription(
    "Partially updates an existing tag and returns the updated record.",
  ),
);