import { describe, expect, it } from "vitest";
import {
  buildEmptyCreateForm,
  createProductionFields,
  hasAnyLanguageValue,
  mediaToLanguageMap,
  toLanguageMap,
  toLanguageMapOrNull,
  validateCreateProductionForm,
} from "@/services/cms/forms";

describe("cms/forms", () => {
  it("exposes create-production field definitions", () => {
    expect(createProductionFields).toHaveLength(7);
    expect(createProductionFields[0]?.key).toBe("title");
    expect(createProductionFields.some((field) => field.key === "description_2")).toBe(true);
  });

  it("builds an empty create form with all language keys", () => {
    const form = buildEmptyCreateForm();

    expect(form.finalized).toBe(false);
    expect(form.title).toEqual({ nl: "", en: "", fr: "" });
    expect(form.video_2).toEqual({ nl: "", en: "", fr: "" });
  });

  it("detects whether any language value is present", () => {
    expect(hasAnyLanguageValue({ nl: "", en: "", fr: "" })).toBe(false);
    expect(hasAnyLanguageValue({ nl: "  ", en: "", fr: "" })).toBe(false);
    expect(hasAnyLanguageValue({ nl: "", en: "x", fr: "" })).toBe(true);
  });

  it("converts language maps and keeps only non-empty trimmed values", () => {
    const source = { nl: "  hallo  ", en: "", fr: " salut " };

    expect(toLanguageMapOrNull(source)).toEqual({ nl: "hallo", fr: "salut" });
    expect(toLanguageMap(source)).toEqual({ nl: "hallo", fr: "salut" });
    expect(toLanguageMapOrNull({ nl: "", en: "", fr: "" })).toBeNull();
    expect(toLanguageMap({ nl: "", en: "", fr: "" })).toEqual({});
  });

  it("maps media from nl only and returns null when nl is empty", () => {
    expect(mediaToLanguageMap({ nl: "", en: "video-en", fr: "video-fr" })).toBeNull();
    expect(mediaToLanguageMap({ nl: "  media-url  ", en: "", fr: "" })).toEqual({ nl: "media-url" });
  });

  it("validates required fields first", () => {
    const t = (key: string, params?: Record<string, unknown>) => {
      if (params?.field) {
        return `${key}:${String(params.field)}`;
      }
      return key;
    };

    const form = buildEmptyCreateForm();
    const result = validateCreateProductionForm(form, t);

    expect(result).toBe("cms.create.validation.requiredOneLanguage:cms.create.fields.title");
  });

  it("validates media requirement after required text fields are filled", () => {
    const t = (key: string) => key;
    const form = buildEmptyCreateForm();

    form.title.nl = "title";
    form.artist.nl = "artist";
    form.tagline.nl = "tagline";
    form.teaser.nl = "teaser";

    const result = validateCreateProductionForm(form, t);
    expect(result).toBe("cms.create.validation.imageRequired");
  });

  it("returns null when create form is valid", () => {
    const t = (key: string) => key;
    const form = buildEmptyCreateForm();

    form.title.nl = "title";
    form.artist.en = "artist";
    form.tagline.fr = "tagline";
    form.teaser.nl = "teaser";
    form.video_1.nl = "image-data-url";

    const result = validateCreateProductionForm(form, t);
    expect(result).toBeNull();
  });
});
