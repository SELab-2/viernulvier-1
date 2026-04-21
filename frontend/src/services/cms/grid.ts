import type { Event as ArchiveEvent, ProductionWithBackwardsRefs, Tag, TagType } from "@viernulvier/shared";
import { collectProductionTagsByIdMap } from "@/services/productions";
import { tagTypeIsGenre } from "@/utils/tagDisplay";
import { localizeWithFallback, type LanguageMap } from "@/utils/i18n";
import { toLocalDateTimeInput } from "./date";
import { extractEventIds } from "./helpers";
import type { CmsEventGridRow, CmsProductionGridRow, CmsTagGridRow } from "./types";

/**
 * Maps archive events to rows used by the CMS events drawer.
 */
export function buildEventGridRows(
  events: ArchiveEvent[],
  hallById: Map<number, { name: LanguageMap }>,
  localize: (map: LanguageMap | null | undefined) => string,
  naLabel: string,
): CmsEventGridRow[] {
  return events
    .slice()
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))
    .map((event) => {
      const hallId = event.hall as number;
      const hall = hallById.get(hallId);

      return {
        id: event.id,
        date: new Date(event.starts_at).toLocaleDateString("nl-BE"),
        time: new Date(event.starts_at).toLocaleTimeString("nl-BE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        location: hall ? localize(hall.name) : `Hall #${hallId}`,
        price: naLabel,
        startsAt: toLocalDateTimeInput(event.starts_at),
        endsAt: toLocalDateTimeInput(event.ends_at ?? ""),
        doorsAt: toLocalDateTimeInput(event.doors_at ?? ""),
        hallId,
        infoNl: event.info?.nl ?? "",
      };
    });
}

/**
 * Builds one CMS production grid row from API production data.
 *
 * The primary genre is derived by tag type (genre), not by tag array position.
 */
export function buildProductionGridRow(
  production: ProductionWithBackwardsRefs,
  tagById: Map<number, Tag>,
  genreTagTypeIds: Set<number>,
  localize: (map: LanguageMap | null | undefined) => string,
): CmsProductionGridRow {
  const eventIds = extractEventIds(production.events as unknown[]);

  const productionTags = collectProductionTagsByIdMap(production, tagById);
  const genreLabels = productionTags
    .filter((tag) => genreTagTypeIds.has(Number(tag.tag_type)))
    .map((tag) => localizeWithFallback(tag.name, localize))
    .filter((label) => label.length > 0);
  const additionalLabels = productionTags
    .filter((tag) => !genreTagTypeIds.has(Number(tag.tag_type)))
    .map((tag) => localizeWithFallback(tag.name, localize))
    .filter((label) => label.length > 0);

  return {
    id: production.id,
    source: production,
    performer: localize(production.artist) || "",
    title: localize(production.title) || "",
    producer: localize(production.supertitle) || "",
    teaser: localize(production.teaser) || "",
    genres: genreLabels.slice(0, 1).join(", ") || "-",
    tags: additionalLabels.join(", ") || "-",
    descriptionOne: localize(production.description) || "",
    descriptionTwo: localize(production.description_2) || "",
    media: localize(production.video_1) || localize(production.video_2) || "",
    events: eventIds,
  };
}

/**
 * Builds all CMS production grid rows and precomputes genre tag-type IDs.
 */
export function buildProductionGridRows(
  productions: ProductionWithBackwardsRefs[],
  tags: Tag[],
  tagTypes: TagType[],
  localize: (map: LanguageMap | null | undefined) => string,
): CmsProductionGridRow[] {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const genreTagTypeIds = new Set(
    tagTypes
      .filter((tagType) => tagTypeIsGenre(tagType))
      .map((tagType) => tagType.id),
  );

  return productions.map((production) => buildProductionGridRow(production, tagById, genreTagTypeIds, localize));
}

/**
 * Applies inline-updated production fields back into an existing grid row.
 *
 * Used for optimistic-ish UI refresh after PATCH requests.
 */
export function applyUpdatedProductionToRow(
  row: CmsProductionGridRow,
  updated: ProductionWithBackwardsRefs,
  localize: (map: LanguageMap | null | undefined) => string,
): void {
  row.source = updated;
  row.performer = localize(updated.artist) || "";
  row.title = localize(updated.title) || "";
  row.producer = localize(updated.supertitle) || "";
  row.teaser = localize(updated.teaser) || "";
  row.descriptionOne = localize(updated.description) || "";
  row.descriptionTwo = localize(updated.description_2) || "";
  row.media = localize(updated.video_1) || localize(updated.video_2) || "";
}

/**
 * Returns bulk-edit targets.
 *
 * If multiple rows are selected and include the clicked row, all selected rows are updated.
 * Otherwise only the clicked row is targeted.
 */
export function buildTagGridRow(
  tag: Tag,
  tagTypeById: Map<number, TagType>,
  localize: (map: LanguageMap | null | undefined) => string,
): CmsTagGridRow {
  const tagTypeId = Number(tag.tag_type);
  const tagType = tagTypeById.get(tagTypeId);
  const productionIds = Array.isArray(tag.productions) ? tag.productions : [];

  return {
    id: tag.id,
    source: tag,
    name: localize(tag.name) || "",
    tagTypeId,
    tagType: tagType ? localize(tagType.name) || `#${tagTypeId}` : `#${tagTypeId}`,
    public: tag.public,
    productionCount: productionIds.length,
  };
}

export function buildTagGridRows(
  tags: Tag[],
  tagTypes: TagType[],
  localize: (map: LanguageMap | null | undefined) => string,
): CmsTagGridRow[] {
  const tagTypeById = new Map<number, TagType>(tagTypes.map((type) => [type.id, type]));
  return tags.map((tag) => buildTagGridRow(tag, tagTypeById, localize));
}

export function applyUpdatedTagToRow(
  row: CmsTagGridRow,
  updated: Tag,
  tagTypeById: Map<number, TagType>,
  localize: (map: LanguageMap | null | undefined) => string,
): void {
  row.source = updated;
  row.name = localize(updated.name) || "";
  row.tagTypeId = Number(updated.tag_type);
  const tagType = tagTypeById.get(row.tagTypeId);
  row.tagType = tagType ? localize(tagType.name) || `#${row.tagTypeId}` : `#${row.tagTypeId}`;
  row.public = updated.public;
}

export function getBulkTargetRows(
  selectedRows: CmsProductionGridRow[],
  primaryRow: CmsProductionGridRow,
): CmsProductionGridRow[] {
  if (
    selectedRows.length > 1
    && selectedRows.some((row) => row.id === primaryRow.id)
  ) {
    return selectedRows;
  }

  return [primaryRow];
}