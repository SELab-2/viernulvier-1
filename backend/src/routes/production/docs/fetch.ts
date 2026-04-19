import { protectedRequest, requestById, RequestDescription, RequestQueryString, RequestResponse, requestSchema } from "@/docs/helpers.js";
import { returnsProduction, returnsProductionArray, sharedRequestSchema } from "./shared.js";
import { ProductionListQuerySchema } from "../helpers/pagination.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { ProductionSchemaWithBackwardsRefs } from "@viernulvier/shared/types/production.js";
import z from "zod";

export const fetchProductionDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  returnsProduction,
  new RequestDescription("Fetch a single production by ID"),
);

export const fetchProductionsDocs = requestSchema(
  sharedRequestSchema,
  returnsProductionArray,
  new RequestQueryString(ProductionListQuerySchema),
  new RequestResponse(HttpSuccess.OK,
    z.object({
      items: ProductionSchemaWithBackwardsRefs.array(),
      total: z.int().positive(),
    }).describe("A list of productions and the total count"),
    true,
  ),
  new RequestDescription(`Fetches a list of productions.

 - Without \`limit\`: returns every production (same ordering as before), as \`{ items, total }\`.
 - With \`limit\`: returns a page \`{ items, total }\` where \`total\` is the matching row count.
 - Optional \`search\`: comma-separated terms (\`search=a,b\`), AND semantics; each term is a
   case-insensitive substring on title, artist, tagline, teaser, description, and hall names.
   Repeating the \`search\` key is still accepted for older clients.
 - Optional \`old_id\`: filter by old_id value.`,
  ),
);

export const fetchProductionWithMetaDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestResponse(HttpSuccess.OK, ProductionSchemaWithBackwardsRefs.withMeta()),
  protectedRequest,
  new RequestDescription("Fetch a single production by ID, with metadata"),
);

