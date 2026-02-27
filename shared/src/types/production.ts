import z from "zod"

const ProductionSchema = z.object({
  id: z.number(),
  title: z.string(),
});

export type Production = z.infer<typeof ProductionSchema>;