import type { Tag, TagType } from "@viernulvier/shared";
import type { LanguageMap } from "@/utils/i18n";

/** Tag choice shown in CMS selectors. */
export interface CmsTagChoice {
  id: number;
  label: string;
}

/** Grouped tags by tag type for CMS editors/modals. */
export interface CmsTagGroup {
  tagTypeId: number;
  label: string;
  isGenre: boolean;
  tags: CmsTagChoice[];
}

/** Normalizes a label for case-insensitive comparisons. */
function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

/** Returns true when a label is recognized as the genre tag type. */
function isGenreLabel(value: string): boolean {
  const normalized = normalizeLabel(value);
  return normalized === "genre" || normalized === "genres";
}

/**
 * Determines whether a tag type should be treated as genre.
 *
 * Uses both the localized label and all translations to avoid locale-specific mismatches.
 */
function isGenreTagType(
  label: string,
  name: LanguageMap | null | undefined,
): boolean {
  if (isGenreLabel(label)) {
    return true;
  }

  if (!name) {
    return false;
  }

  return Object.values(name).some((value) => isGenreLabel(String(value ?? "")));
}

/** Localizes a label and falls back to a readable placeholder when empty. */
function localizeLabel(
  label: LanguageMap | null | undefined,
  localize: (map: LanguageMap | null | undefined) => string,
  fallback: string,
): string {
  const localized = localize(label);
  return localized.length > 0 ? localized : fallback;
}

/**
 * Builds sorted CMS tag groups from flat tag/tag-type API payloads.
 *
 * Behavior:
 * - groups tags by `tag_type`
 * - sorts tag labels inside groups
 * - marks and orders genre groups first
 * - filters out empty groups
 */
export function buildCmsTagGroups(
  tags: Tag[],
  tagTypes: TagType[],
  localize: (map: LanguageMap | null | undefined) => string,
): CmsTagGroup[] {
  const tagTypeById = new Map<number, TagType>(tagTypes.map((tagType) => [tagType.id, tagType]));
  const tagsByType = new Map<number, Tag[]>();

  for (const tag of tags) {
    const tagTypeId = Number(tag.tag_type);
    if (!Number.isFinite(tagTypeId)) {
      continue;
    }

    const current = tagsByType.get(tagTypeId) ?? [];
    current.push(tag);
    tagsByType.set(tagTypeId, current);
  }

  return [...tagTypeById.values()]
    .map((tagType) => {
      const label = localizeLabel(tagType.name, localize, `Tag type #${tagType.id}`);
      const groupedTags = (tagsByType.get(tagType.id) ?? [])
        .slice()
        .sort((left, right) => {
          const leftLabel = localize(left.name);
          const rightLabel = localize(right.name);
          return leftLabel.localeCompare(rightLabel, "nl", { sensitivity: "base" });
        })
        .map((tag) => ({
          id: tag.id,
          label: localizeLabel(tag.name, localize, `Tag #${tag.id}`),
        }));

      return {
        tagTypeId: tagType.id,
        label,
        isGenre: isGenreTagType(label, tagType.name),
        tags: groupedTags,
      };
    })
    .filter((group) => group.tags.length > 0)
    .sort((left, right) => {
      if (left.isGenre !== right.isGenre) {
        return left.isGenre ? -1 : 1;
      }
      return left.label.localeCompare(right.label, "nl", { sensitivity: "base" });
    });
}