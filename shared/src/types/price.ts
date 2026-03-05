import z from 'zod'

import { createSchema, EventSchema } from './index.js'
import type { SchemaWithMeta } from './index.js'
import { foreignKey, primaryKey } from './helpers.js'

export const PriceSchema: SchemaWithMeta<any> = createSchema({
    id: primaryKey(),
    event: foreignKey((): typeof EventSchema => EventSchema),
    amount: z.number().nonnegative(),

    // unnecessary
    // box_office_id: z.int().nonnegative(),
    // available: z.int().nonnegative(),
    // contingent_id: z.int().nonnegative().nullable(),
    // expires_at: z.date().nullable(),
    // price: z.json(),
    // rank: z.json(),
});

export type Price = z.infer<typeof PriceSchema>;
export type PriceWithMeta = z.infer<ReturnType<typeof PriceSchema.withMeta>>;