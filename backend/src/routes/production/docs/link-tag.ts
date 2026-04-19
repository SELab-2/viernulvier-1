import { requestById, RequestDescription, RequestResponse, requestSchema } from "@/docs/helpers.js";
import { sharedRequestSchema } from "./shared.js";
import { HttpSuccess } from "@/routes/helpers.js";
import z from "zod";

export const linkTagToProductionDocs = requestSchema(
  sharedRequestSchema,
  requestById,
  new RequestResponse(HttpSuccess.OK, z.object({ linked: z.boolean() })),
  new RequestDescription(`Links a tag to a production.
    Idempotent: linking an already linked tag returns\`{ linked: false }\`.
    `,
  ),
);