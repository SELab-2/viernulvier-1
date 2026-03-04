import z from "zod";

export const ProductionSchema = z
  .object({
    id: z.coerce.number().int().positive().describe("id for the production."),
    title: z.string().describe("title for the given production."),
  })
  .describe("Production");

export type Production = z.infer<typeof ProductionSchema>;
