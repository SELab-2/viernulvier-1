import z from "zod"

export const AdminSchema: z.ZodObject<any> = z.object({
  // metadata (only time this is hardcoded)
  created_by: z.lazy(() => AdminSchema),
  created_at: z.date(),
  updated_by: z.lazy(() => AdminSchema),
  updated_at: z.date(),

  id: z.number(),
  username: z.string(),
  profile_picture: z.string().nullable(),
});

export type Admin = z.infer<typeof AdminSchema>;