import type { SupportedLang } from "@/i18n";
import type { LanguageMap } from "@/utils/language-utils";
import { emptyLangRecord } from "./helpers";
import type { CmsCreateFieldConfig, CreateFormState, CreateTagFormState, CreateFormMediaItem, CreateBlogPostFormState } from "./types";
import type { CmsCreateFieldConfig, CreateBlogPostFormState, CreateFormState, CreateTagFormState, CreateTagTypeFormState } from "./types";

/**
 * Field definitions used to render the create-production modal dynamically.
 */
export const createProductionFields: CmsCreateFieldConfig[] = [
  { key: "title", labelKey: "cms.create.fields.title", required: true, multiline: false },
  { key: "artist", labelKey: "cms.create.fields.artist", required: true, multiline: false },
  { key: "tagline", labelKey: "cms.create.fields.tagline", required: true, multiline: true },
  { key: "teaser", labelKey: "cms.create.fields.teaser", required: true, multiline: true },
  { key: "supertitle", labelKey: "cms.create.fields.supertitle", required: false, multiline: false },
  { key: "description", labelKey: "cms.create.fields.description", required: false, multiline: true },
  { key: "description_2", labelKey: "cms.create.fields.descriptionTwo", required: false, multiline: true },
];

/**
 * Creates a clean initial state for the production-create form.
 */
export function buildEmptyCreateForm(): CreateFormState {
  return {
    finalized: false,
    title: emptyLangRecord(),
    artist: emptyLangRecord(),
    tagline: emptyLangRecord(),
    teaser: emptyLangRecord(),
    supertitle: emptyLangRecord(),
    description: emptyLangRecord(),
    description_2: emptyLangRecord(),
    media: [],
  };
}

/**
 * Creates a new media item with a unique client ID.
 */
export function createMediaItem(
  type: "image" | "video",
  url: string = "",
): CreateFormMediaItem {
  return {
    id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    url,
    isUploaded: false,
  };
}

/**
 * Returns true if at least one language value contains non-whitespace text.
 */
export function hasAnyLanguageValue(values: Record<SupportedLang, string>): boolean {
  return Object.values(values).some((value) => value.trim().length > 0);
}

/**
 * Trims values and returns a sparse language map, or null when all values are empty.
 */
export function toLanguageMapOrNull(
  values: Record<SupportedLang, string>,
): LanguageMap | null {
  const next: LanguageMap = {};
  for (const [lang, rawValue] of Object.entries(values) as Array<[SupportedLang, string]>) {
    const value = rawValue.trim();
    if (value.length > 0) {
      next[lang] = value;
    }
  }

  return Object.keys(next).length > 0 ? next : null;
}

/**
 * Trims values and returns a sparse language map.
 * Empty input yields an empty object instead of null.
 */
export function toLanguageMap(
  values: Record<SupportedLang, string>,
): LanguageMap {
  return toLanguageMapOrNull(values) ?? {};
}

/**
 * Converts media input to API payload shape.
 *
 * CMS currently stores only NL media URLs, so this helper returns `{ nl }` or null.
 */
export function mediaToLanguageMap(values: Record<SupportedLang, string>): LanguageMap | null {
  const nlValue = values.nl.trim();
  if (nlValue.length === 0) {
    return null;
  }
  return { nl: nlValue };
}

export function buildEmptyTagForm(): CreateTagFormState {
  return {
    name: emptyLangRecord(),
    tagTypeId: null,
    public: true,
  };
}

export function validateCreateTagForm(
  form: CreateTagFormState,
  t: (key: string, params?: Record<string, unknown>) => string,
): string | null {
  if (!hasAnyLanguageValue(form.name)) {
    return t("cms.create.validation.requiredOneLanguage", {
      field: t("cms.columns.tagName"),
    });
  }
  if (form.tagTypeId === null || form.tagTypeId <= 0) {
    return t("cms.create.validation.tagTypeRequired");
  }
  return null;
}

export function buildEmptyBlogPostForm(): CreateBlogPostFormState {
  return {
    title: { nl: "", en: "", fr: "" },
    content: { nl: "", en: "", fr: "" },
    productions: [],
  };
}

export function validateCreateBlogPostForm(
  form: CreateBlogPostFormState,
  t: (key: string, params?: Record<string, unknown>) => string,
): string | null {
  if (!hasAnyLanguageValue(form.title)) {
    return t("cms.create.validation.requiredOneLanguage");
  }
  if (!hasAnyLanguageValue(form.content)) {
    return t("cms.create.validation.requiredOneLanguage");
  }
  return null;
}

export function buildEmptyTagTypeForm(): CreateTagTypeFormState {
  return {
    name: emptyLangRecord(),
  };
}

export function validateCreateTagTypeForm(
  form: CreateTagTypeFormState,
  t: (key: string, params?: Record<string, unknown>) => string,
): string | null {
  if (!hasAnyLanguageValue(form.name)) {
    return t("cms.create.validation.requiredOneLanguage", {
      field: t("cms.columns.tagTypeName"),
    });
  }
  return null;
}

export function validateCreateProductionForm(
  form: CreateFormState,
  t: (key: string, params?: Record<string, unknown>) => string,
): string | null {
  const requiredKeys: Array<keyof Pick<CreateFormState, "title" | "artist" | "tagline" | "teaser">> = [
    "title",
    "artist",
    "tagline",
    "teaser",
  ];

  for (const key of requiredKeys) {
    if (!hasAnyLanguageValue(form[key])) {
      return t("cms.create.validation.requiredOneLanguage", {
        field: t(`cms.create.fields.${key}`),
      });
    }
  }

  if (form.media.length === 0 || !form.media.some((m) => m.url.trim().length > 0)) {
    return t("cms.create.validation.imageRequired");
  }
  return null;
}