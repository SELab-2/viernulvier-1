import { CombinedRequestSchema, DefaultRequestErrorMessages, RequestParams, RequestResponse, RequestTag } from "@/docs/helpers.js";
import { HttpSuccess } from "@/routes/helpers.js";
import { AdminSchema, stringToInt } from "@viernulvier/shared/index.js";
import z from "zod";

export const sharedRequestSchema = new CombinedRequestSchema(
  DefaultRequestErrorMessages,
  new RequestTag("auth"),
);

export const requestById = new RequestParams(
  z.object({ id: stringToInt }),
);

export const returnsAdmin = new RequestResponse(HttpSuccess.OK, AdminSchema, true);

export const returnsAdminArray = new RequestResponse(HttpSuccess.OK, z.array(AdminSchema), true);