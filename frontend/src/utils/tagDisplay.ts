import type { TagType } from "@viernulvier/shared";
import { ALL_LANGUAGES, localize, type Language } from "@/utils/language-utils";

/** Resolved tag for production list / detail chips. */
export type ProductionTagChip = {
  tagId: number;
  label: string;
  isGenre: boolean;
};

/**
 * True when the tag type’s name is “Genre” / “Genres” in any supported locale.
 * Matches legacy and API data where the type label may only exist in one language.
 */
export function tagTypeIsGenre(tagType: TagType | undefined): boolean {
  if (!tagType) return false;
  for (const lang of ALL_LANGUAGES as Language[]) {
    const label = localize(tagType.name, lang);
    if (!label) continue;
    const n = label.trim().toLowerCase();
    if (n === "genre" || n === "genres") return true;
  }
  return false;
}

/** Genres first; order within each group follows the input (stable sort). */
export function sortProductionTagChipsGenresFirst(
  chips: readonly ProductionTagChip[],
): ProductionTagChip[] {
  return [...chips].sort(
    (a, b) => Number(b.isGenre) - Number(a.isGenre),
  );
}
