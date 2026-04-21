import type { Admin, Event as ArchiveEvent, ProductionWithBackwardsRefs, Tag, TagType } from "@viernulvier/shared";
import { collectProductionTagsByIdMap } from "@/services/productions";
import type { LanguageMap } from "@/utils/i18n";
import { toLocalDateTimeInput } from "./date";
import { extractEventIds } from "./helpers";
import type { CmsAdminGridRow, CmsEventGridRow, CmsProductionGridRow, CreateAdminFormState, CmsTagGridRow } from "./types";

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
  localize: (map: LanguageMap | null | undefined) => string,
): CmsProductionGridRow {
  const eventIds = extractEventIds(production.events as unknown[]);

  const tagLabels = collectProductionTagsByIdMap(production, tagById)
    .map((tag) => localize(tag.name))
    .filter((label) => label.length > 0);

  return {
    id: production.id,
    source: production,
    performer: localize(production.artist) || "",
    title: localize(production.title) || "",
    producer: localize(production.supertitle) || "",
    teaser: localize(production.teaser) || "",
    genres: tagLabels.slice(0, 1).join(", ") || "-",
    tags: tagLabels.slice(1).join(", ") || "-",
    descriptionOne: localize(production.description) || "",
    descriptionTwo: localize(production.description_2) || "",
    media: localize(production.video_1) || "",
    events: eventIds,
  };
}

export function buildProductionGridRows(
  productions: ProductionWithBackwardsRefs[],
  tags: Tag[],
  localize: (map: LanguageMap | null | undefined) => string,
): CmsProductionGridRow[] {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));

  return productions.map((production) => buildProductionGridRow(production, tagById, localize));
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
 
export function buildAdminGridRow(admin: Admin): CmsAdminGridRow {
  return {
    id: admin.id,
    source: admin,
    username: admin.username,
    // profilePicture: admin.profile_picture ?? null,
    super: admin.super,
  };
}
 
export function buildAdminGridRows(admins: Admin[]): CmsAdminGridRow[] {
  return admins.map(buildAdminGridRow);
}
 
export function applyUpdatedAdminToRow(
  row: CmsAdminGridRow,
  updated: Admin,
): void {
  row.source = updated;
  row.username = updated.username;
  // row.profilePicture = updated.profile_picture ?? null;
  row.super = updated.super;
}

export function buildEmptyAdminForm(): CreateAdminFormState {
  return {
    username: "",
    password: "",
    super: false,
  };
}
 
 