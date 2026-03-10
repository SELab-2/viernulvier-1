import { ProductionSchema } from "./production.js";
import z from "zod";
import { primaryKey, foreignKey, languageMap, } from "./helpers.js";
import { createSchema } from "./metadata.js";
export const TagTypeSchema = createSchema({
    id: primaryKey(),
    name: languageMap,
    visible: z.boolean(),
});
export const TagSchema = createSchema({
    id: primaryKey(),
    name: languageMap,
    type: foreignKey(() => TagTypeSchema),
    get productions() {
        return z.array(foreignKey(() => ProductionSchema));
    },
});
//# sourceMappingURL=tag.js.map