import {
  protectedRequest,
  requestById,
  RequestDescription,
  RequestQueryString,
  RequestResponse,
  requestSchema,
} from "@/docs/helpers.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { TagSchema } from "@viernulvier/shared/index.js";
import { sharedRequestSchema, returnsTag, returnsTagArray } from "./shared.js";
import { z } from "zod";

export const fetchTagDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsTag,
  protectedRequest,
  new RequestDescription(
    "Fetches a single tag by ID; non-public tags are included.",
  ),
);

export const fetchTagVisibleDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsTag,
  new RequestDescription("Fetches a single public tag by ID."),
);

export const fetchTagWithMetaDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestResponse(HttpSuccess.OK, TagSchema.withMeta()),
  protectedRequest,
  new RequestDescription(
    "Returns a single tag with metadata by ID; non-public tags are included.",
  ),
);

const TagsListQueryInputSchema = z.object({
  production: z.string().optional(),
  old_id: z.string().optional(),
  tag_type: z.string().optional(),
  /** When `includeProductions=true`, each tag includes a `productions` id list; otherwise the field is omitted. */
  includeProductions: z.literal("true").optional(),
  /** When `includeProductionCount=true`, each tag includes `production_count` (distinct productions); cheaper than `includeProductions`. */
  includeProductionCount: z.literal("true").optional(),
});

export const fetchTagsDocs = requestSchema(
  sharedRequestSchema,
  new RequestQueryString(TagsListQueryInputSchema),
  returnsTagArray,
  protectedRequest,
  new RequestDescription(
    "Fetches tags, optionally filtered by `production` or by `old_id` + `tag_type` together. Non-public tags are included.",
  ),
);

export const fetchTagsVisibleDocs = requestSchema(
  sharedRequestSchema,
  new RequestQueryString(TagsListQueryInputSchema),
  returnsTagArray,
  new RequestDescription(
    "Fetches public tags, optionally filtered by `production` or by `old_id` + `tag_type` together.",
  ),
);
