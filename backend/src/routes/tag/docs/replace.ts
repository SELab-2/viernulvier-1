import { requestSchema, requestById, RequestBody, RequestDescription } from "@/docs/helpers.js";
import { ReplaceTagBodySchema } from "../handlers/replace.js";
import { sharedRequestSchema, returnsTag } from "./shared.js";

export const replaceTagDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestBody(ReplaceTagBodySchema),
  returnsTag,
  new RequestDescription(
    "Replaces an existing tag's fields and returns the updated record.",
  ),
);