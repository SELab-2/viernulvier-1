import type { Event, Hall, Tag } from "@viernulvier/shared";
import type { SupportedLang } from "@/i18n";

const LOCALE_BY_LANG: Record<SupportedLang, string> = {
  nl: "nl-BE",
  en: "en-GB",
  fr: "fr-BE",
};

/**
 * Groups events by production id for archive list cards (dates, halls).
 */
export function groupEventsByProductionId(
  events: Event[],
): Map<number, Event[]> {
  const map = new Map<number, Event[]>();
  for (const ev of events) {
    const pid = ev.production as number;
    const list = map.get(pid);
    if (list) list.push(ev);
    else map.set(pid, [ev]);
  }
  for (const [, list] of map) {
    list.sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
  }
  return map;
}

export function tagMapById(tags: Tag[]): Map<number, Tag> {
  return new Map(tags.map((t) => [t.id, t]));
}

export function hallMapById(halls: Hall[]): Map<number, Hall> {
  return new Map(halls.map((h) => [h.id, h]));
}

export type ProductionDateSummary = {
  /** Primary line, e.g. first performance date */
  line: string | null;
  /** Additional performances after the first (for “+ N more”) */
  moreCount: number;
};

/**
 * First performance date string + count of remaining events.
 */
export function summarizeProductionDates(
  events: Event[] | undefined,
  lang: SupportedLang,
): ProductionDateSummary {
  if (!events?.length) return { line: null, moreCount: 0 };
  const locale = LOCALE_BY_LANG[lang];
  const first = events[0]!;
  const d = new Date(first.starts_at);
  const line = d.toLocaleDateString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return { line, moreCount: Math.max(0, events.length - 1) };
}

/**
 * Distinct hall names for a production's events, localized.
 */
export function distinctHallNames(
  events: Event[] | undefined,
  hallsById: Map<number, Hall>,
  lang: SupportedLang,
): string[] {
  if (!events?.length) return [];
  const seen = new Set<number>();
  const names: string[] = [];
  for (const ev of events) {
    const hid = ev.hall as number;
    if (seen.has(hid)) continue;
    seen.add(hid);
    const hall = hallsById.get(hid);
    if (!hall) continue;
    const raw =
      hall.name[lang] ?? hall.name.nl ?? hall.name.en ?? hall.name.fr;
    if (raw) names.push(raw);
  }
  return names;
}
