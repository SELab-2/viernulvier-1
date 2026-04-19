import { requestSchema, requestById, RequestBody, RequestDescription } from "@/docs/helpers.js";
import { ReplaceHallBodySchema } from "../handlers/replace.js";
import { sharedRequestSchema, returnsHall } from "./shared.js";

export const replaceHallDocs = requestSchema(
  sharedRequestSchema,
  returnsHall,
  requestById,
  new RequestBody(ReplaceHallBodySchema),
  new RequestDescription(`Replaces an existing hall and returns the updated record. Unlike \`editHall\`, all fields are required and will be overwritten.`),
);