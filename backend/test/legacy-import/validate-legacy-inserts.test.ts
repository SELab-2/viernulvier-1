import { describe, expect, it } from "vitest";
import z from "zod";
import { CreateProductionBodySchema } from "@/routes/production/handlers/body-schema.js";
import { EventCreateSchema } from "@/routes/event/handlers/helper.js";
import {
  formatLegacyZodError,
  legacyEventCreateBody,
  legacyGenreTagCreateBody,
  legacyHallInsertBody,
  legacyProductionRowToCreateBody,
  LegacyHallInsertSchema,
  LegacyTagCreateBodySchema,
} from "@/legacy-import/validate-legacy-inserts.js";

describe("formatLegacyZodError", () => {
  it("formats issues with path and root fallback", () => {
    const pathIssue = z.string().safeParse(1);
    expect(pathIssue.success).toBe(false);
    if (pathIssue.success) throw new Error("expected fail");
    expect(formatLegacyZodError(pathIssue.error)).toMatch(/string/);

    const rootIssue = z
      .object({})
      .strict()
      .safeParse({ extra: 1 });
    expect(rootIssue.success).toBe(false);
    if (rootIssue.success) throw new Error("expected fail");
    expect(formatLegacyZodError(rootIssue.error)).toContain("(root)");
  });
});

describe("legacyProductionRowToCreateBody + CreateProductionBodySchema", () => {
  it("accepts a typical legacy CSV row", () => {
    const row = {
      id: "1",
      titel: "My show",
      ondertitel: "Artist",
      description1: "Long text",
      description2: "",
      genre: "Drama",
    };
    const body = legacyProductionRowToCreateBody(row);
    const parsed = CreateProductionBodySchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it("maps description2 when present (nullableLanguageMap branch)", () => {
    const row = {
      id: "2",
      titel: "T",
      ondertitel: "",
      description1: "",
      description2: "Second block",
      genre: "",
    };
    const body = legacyProductionRowToCreateBody(row);
    expect(body.description_2).toEqual({ nl: "Second block" });
    expect(CreateProductionBodySchema.safeParse(body).success).toBe(true);
  });

  it("treats missing titel column as empty title", () => {
    const body = legacyProductionRowToCreateBody({ id: "3" });
    expect(body.title).toEqual({ nl: "" });
  });
});

describe("LegacyTagCreateBodySchema", () => {
  it("accepts a genre tag body", () => {
    const parsed = LegacyTagCreateBodySchema.safeParse(legacyGenreTagCreateBody("Jazz", 20));
    expect(parsed.success).toBe(true);
  });
});

describe("LegacyHallInsertSchema", () => {
  it("accepts hall insert from parsed legacy hall", () => {
    const parsed = LegacyHallInsertSchema.safeParse(
      legacyHallInsertBody({ name: "Main", address: "Street 1" }),
    );
    expect(parsed.success).toBe(true);
  });
});

describe("EventCreateSchema (legacy event body)", () => {
  it("accepts event create payload with end and doors times", () => {
    const startsAt = new Date("2024-06-01T14:00:00.000Z");
    const endsAt = new Date("2024-06-01T16:00:00.000Z");
    const body = legacyEventCreateBody({
      startsAt,
      endsAt,
      doorsAt: startsAt,
      productionId: 7,
      hallId: 3,
    });
    const parsed = EventCreateSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });

  it("accepts null ends_at and doors_at (legacy CSV has no doors; endtime often empty)", () => {
    const startsAt = new Date("2024-06-01T14:00:00.000Z");
    const body = legacyEventCreateBody({
      startsAt,
      endsAt: null,
      doorsAt: null,
      productionId: 7,
      hallId: 3,
    });
    const parsed = EventCreateSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error("expected success");
    expect(parsed.data.ends_at).toBeNull();
    expect(parsed.data.doors_at).toBeNull();
  });
});
