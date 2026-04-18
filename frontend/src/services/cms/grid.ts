import type { Event as ArchiveEvent, ProductionWithBackwardsRefs, Tag, TagType } from "@viernulvier/shared";
import { collectProductionTagsByIdMap } from "@/services/productions";
import type { LanguageMap } from "@/utils/i18n";
import { toLocalDateTimeInput } from "./date";
import { extractEventIds } from "./helpers";
import type { CmsEventGridRow, CmsProductionGridRow } from "./types";

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

function isGenreLabel(value: string): boolean {
  const normalized = normalizeLabel(value);
  return normalized === "genre" || normalized === "genres";
}

function isGenreTagType(name: LanguageMap | null | undefined): boolean {
  if (!name) {
    return false;
  }

  return Object.values(name).some((value) => isGenreLabel(String(value ?? "")));
}

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
        endsAt: toLocalDateTimeInput(event.ends_at),
        doorsAt: toLocalDateTimeInput(event.doors_at),
        hallId,
        infoNl: event.info?.nl ?? "",
      };
    });
}

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
    .map((tag) => localize(tag.name))
    .filter((label) => label.length > 0);
  const additionalLabels = productionTags
    .filter((tag) => !genreTagTypeIds.has(Number(tag.tag_type)))
    .map((tag) => localize(tag.name))
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
    media: localize(production.video_1) || "",
    events: eventIds,
  };
}

export function buildProductionGridRows(
  productions: ProductionWithBackwardsRefs[],
  tags: Tag[],
  tagTypes: TagType[],
  localize: (map: LanguageMap | null | undefined) => string,
): CmsProductionGridRow[] {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const genreTagTypeIds = new Set(
    tagTypes
      .filter((tagType) => isGenreTagType(tagType.name))
      .map((tagType) => tagType.id),
  );

  return productions.map((production) => buildProductionGridRow(production, tagById, genreTagTypeIds, localize));
}

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
  row.media = localize(updated.video_1) || "";
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