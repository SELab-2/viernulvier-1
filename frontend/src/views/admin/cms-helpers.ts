import type { Event as ArchiveEvent, ProductionWithBackwardsRefs, Tag } from "@viernulvier/shared";
import type { SupportedLang } from "@/i18n";
import type { LanguageMap } from "@/utils/i18n";

export interface CmsEventGridRow {
  id: number;
  date: string;
  time: string;
  location: string;
  price: string;
  startsAt: string;
  endsAt: string;
  doorsAt: string;
  hallId: number;
  infoNl: string;
}

export interface CmsCreateLinkedEventForm {
  startsAt: string;
  endsAt: string;
  doorsAt: string;
  hallId: number;
  infoNl: string;
}

export interface CmsProductionGridRow {
  id: number;
  source: ProductionWithBackwardsRefs;
  performer: string;
  title: string;
  producer: string;
  teaser: string;
  genres: string;
  tags: string;
  descriptionOne: string;
  descriptionTwo: string;
  media: string;
  events: number[];
}

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

export function toLocalDateTimeInput(value: Date | string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function toIsoStringFromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

export function makeEditorValues(map: LanguageMap | null | undefined): Record<SupportedLang, string> {
  return {
    nl: map?.nl ?? "",
    fr: map?.fr ?? "",
    en: map?.en ?? "",
  };
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
  localize: (map: LanguageMap | null | undefined) => string,
): CmsProductionGridRow {
  const eventIds = extractEventIds(production.events as unknown[]);

  const tagLabels = production.tags
    .map((tagId) => tagById.get(tagId as number))
    .filter((tag): tag is Tag => tag !== undefined)
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