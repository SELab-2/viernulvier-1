import { EventCreateSchema } from "@/routes/event/handlers/helper.js";
import { CreateProductionBodySchema } from "@/routes/production/handlers/body-schema.js";
import { HallSchema, TagSchema } from "@viernulvier/shared/index.js";
import type { z } from "zod";

import { toLanguageMap } from "./shared.js";

export const LegacyTagCreateBodySchema = TagSchema.omit({ id: true, productions: true });

export const LegacyHallInsertSchema = HallSchema.omit({ id: true });

function nullableLanguageMap(value: string): Record<"nl", string> | null {
  return value.length === 0 ? null : { nl: value };
}

const emptyLanguageMap = (): Record<"nl", string> => toLanguageMap("");

/**
 * Maps a normalized legacy CSV row to the same body shape as `createProduction`,
 * so {@link CreateProductionBodySchema} is the single contract before SQL.
 */
export function legacyProductionRowToCreateBody(row: Record<string, string>): z.infer<
  typeof CreateProductionBodySchema
> {
  const title = row["titel"] ?? "";
  const artist = row["ondertitel"] ?? "";
  const description1 = row["description1"] ?? "";
  const description2 = row["description2"] ?? "";
  const empty = emptyLanguageMap();
  return {
    title: toLanguageMap(title),
    artist: toLanguageMap(artist),
    tagline: empty,
    teaser: empty,
    finalized: false,
    old_id: null,
    supertitle: null,
    description: description1.length > 0 ? toLanguageMap(description1) : null,
    description_extra: null,
    description_2: nullableLanguageMap(description2) ? toLanguageMap(description2) : null,
    video_1: null,
    video_2: null,
    quote: null,
    quote_source: null,
    programme: null,
    info: null,
  };
}

export function legacyGenreTagCreateBody(
  genreName: string,
  genreTagTypeId: number,
): z.infer<typeof LegacyTagCreateBodySchema> {
  return {
    old_id: null,
    name: toLanguageMap(genreName),
    tag_type: genreTagTypeId,
    public: true,
  };
}

export function legacyHallInsertBody(hall: { name: string; address: string }): z.infer<
  typeof LegacyHallInsertSchema
> {
  return {
    old_id: null,
    name: toLanguageMap(hall.name),
    address: hall.address,
  };
}

export function legacyEventCreateBody(input: {
  startsAt: Date;
  endsAt: Date | null;
  doorsAt: Date | null;
  productionId: number;
  hallId: number;
}): z.infer<typeof EventCreateSchema> {
  return {
    old_id: null,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    doors_at: input.doorsAt,
    info: toLanguageMap(""),
    production: input.productionId,
    hall: input.hallId,
  };
}

export function formatLegacyZodError(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
}
