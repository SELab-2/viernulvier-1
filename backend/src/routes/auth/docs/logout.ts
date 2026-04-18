import { requestSchema, RequestResponse, RequestDescription } from "@/docs/helpers.js";
import { HttpSuccess } from "@/routes/helpers.js";
import z from "zod";
import { sharedRequestSchema } from "./shared.js";

export const logoutDocs = requestSchema(
  sharedRequestSchema,
  new RequestResponse(HttpSuccess.OK, z.object({ success: z.literal(true) })),
  new RequestDescription("Logs out the current admin by revoking the session token and clearing the session cookie. The token's `jti` claim is added to the server denylist, rejecting any further requests made with it until it naturally expires. Works for both cookie-based and `Authorization` header-based sessions."),
);