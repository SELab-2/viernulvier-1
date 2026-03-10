import z from "zod";
import { AdminSchema } from "./admin.js";
import { foreignKey } from "./helpers.js";
export const MetadataShape = {
    created_by: foreignKey(() => AdminSchema),
    created_at: z.coerce.date(),
    updated_by: foreignKey(() => AdminSchema),
    updated_at: z.coerce.date(),
};
/**
 * Creates a Zod schema with an additional `withMeta` method that extends the schema with metadata fields.
 * Use this instead of `z.object({...})` when defining new schemas.
 *
 * @param shape - The Zod raw shape to create the schema from
 * @returns A Zod object schema with a non-enumerable `withMeta` method
 */
export function createSchema(shape) {
    const base = z.object(shape);
    return Object.defineProperty(base, "withMeta", {
        value: () => base.extend(MetadataShape),
        writable: false,
        enumerable: false,
        configurable: false,
    });
}
//# sourceMappingURL=metadata.js.map