import type { SupportedLang } from "@/i18n";
import type { LanguageMap } from "@/utils/i18n";
import { emptyLangRecord } from "./helpers";
import type { CmsCreateFieldConfig, CreateFormState } from "./types";

export const createProductionFields: CmsCreateFieldConfig[] = [
  { key: "title", labelKey: "cms.create.fields.title", required: true, multiline: false },
  { key: "artist", labelKey: "cms.create.fields.artist", required: true, multiline: false },
  { key: "tagline", labelKey: "cms.create.fields.tagline", required: true, multiline: true },
  { key: "teaser", labelKey: "cms.create.fields.teaser", required: true, multiline: true },
  { key: "supertitle", labelKey: "cms.create.fields.supertitle", required: false, multiline: false },
  { key: "description", labelKey: "cms.create.fields.description", required: false, multiline: true },
  { key: "description_2", labelKey: "cms.create.fields.descriptionTwo", required: false, multiline: true },
];

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
    video_1: emptyLangRecord(),
    video_2: emptyLangRecord(),
  };
}

export function hasAnyLanguageValue(values: Record<SupportedLang, string>): boolean {
  return Object.values(values).some((value) => value.trim().length > 0);
}

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

export function toLanguageMap(
  values: Record<SupportedLang, string>,
): LanguageMap {
  return toLanguageMapOrNull(values) ?? {};
}

export function mediaToLanguageMap(values: Record<SupportedLang, string>): LanguageMap | null {
  const nlValue = values.nl.trim();
  if (nlValue.length === 0) {
    return null;
  }
  return { nl: nlValue };
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

  if (!hasAnyLanguageValue(form.video_1) && !hasAnyLanguageValue(form.video_2)) {
    return t("cms.create.validation.imageRequired");
  }
  return null;
}