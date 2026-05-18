import { CombinedRequestSchema, DefaultRequestErrorMessages, RequestResponse, RequestTag } from "@/docs/helpers.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { AdminSchema } from "@viernulvier/shared/index.js";
import z from "zod";

export const sharedRequestSchema = new CombinedRequestSchema(
  DefaultRequestErrorMessages,
  new RequestTag("auth"),
);

export const returnsAdmin = new RequestResponse(HttpSuccess.OK, AdminSchema, true);

export const returnsAdminArray = new RequestResponse(HttpSuccess.OK, z.array(AdminSchema), true);