import type { Tag, TagType } from "@viernulvier/shared";
import { localizeWithFallback, type LanguageMap } from "@/utils/i18n";
import { tagTypeIsGenre } from "@/utils/tagDisplay";

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
      const label = localizeWithFallback(tagType.name, localize) || `Tag type #${tagType.id}`;
      const groupedTags = (tagsByType.get(tagType.id) ?? [])
        .slice()
        .sort((left, right) => {
          const leftLabel = localize(left.name);
          const rightLabel = localize(right.name);
          return leftLabel.localeCompare(rightLabel, "nl", { sensitivity: "base" });
        })
        .map((tag) => ({
          id: tag.id,
          label: localizeWithFallback(tag.name, localize) || `Tag #${tag.id}`,
        }));

      return {
        tagTypeId: tagType.id,
        label,
        isGenre: tagTypeIsGenre(tagType),
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