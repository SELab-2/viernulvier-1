import z from "zod";
import { createSchema } from "./metadata.js";
import { ImageSchema } from "./index.js";
import { primaryKey, foreignKey } from "./helpers.js";
export const CropSchema = createSchema({
    id: primaryKey(),
    image_id: foreignKey(() => ImageSchema),
    url: z.url().min(1).max(2048),
});
//# sourceMappingURL=crop.js.map