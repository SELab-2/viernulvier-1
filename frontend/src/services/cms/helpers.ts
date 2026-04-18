import type { SupportedLang } from "@/i18n";
import type { LanguageMap } from "@/utils/i18n";

/**
 * Returns an empty language record for NL/FR/EN used by CMS forms.
 */
export function emptyLangRecord(): Record<SupportedLang, string> {
  return { nl: "", fr: "", en: "" };
}

/**
 * Normalizes mixed event references into numeric IDs.
 *
 * Supports numeric/string IDs and object references like `{ id: ... }`.
 * Invalid entries are discarded.
 */
export function extractEventIds(values: unknown[]): number[] {
  return values
    .map((entry) => {
      if (typeof entry === "number" || typeof entry === "string") {
        return Number(entry);
      }

      if (entry && typeof entry === "object" && "id" in entry) {
        return Number((entry as { id: unknown }).id);
      }

      return Number.NaN;
    })
    .filter((id) => Number.isFinite(id));
}

/**
 * Builds editor values for all supported languages, filling missing values with empty strings.
 */
export function makeEditorValues(map: LanguageMap | null | undefined): Record<SupportedLang, string> {
  return {
    nl: map?.nl ?? "",
    fr: map?.fr ?? "",
    en: map?.en ?? "",
  };
}
