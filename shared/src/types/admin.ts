import z from "zod"

export const AdminSchema: z.ZodObject = z.object({
  // metadata
  created_by: z.lazy(() => AdminSchema),
  created_at: z.date(),
  updated_at: z.date(),

  id: z.number(),
  username: z.string(),
  profile_picture: z.string(),
});

export type Admin = z.infer<typeof AdminSchema>;