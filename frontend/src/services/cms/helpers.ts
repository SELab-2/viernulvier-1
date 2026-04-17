import type { SupportedLang } from "@/i18n";
import type { LanguageMap } from "@/utils/i18n";

export function emptyLangRecord(): Record<SupportedLang, string> {
  return { nl: "", fr: "", en: "" };
}

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

export function makeEditorValues(map: LanguageMap | null | undefined): Record<SupportedLang, string> {
  return {
    nl: map?.nl ?? "",
    fr: map?.fr ?? "",
    en: map?.en ?? "",
  };
}
