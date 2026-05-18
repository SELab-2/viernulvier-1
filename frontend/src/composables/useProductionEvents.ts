import { ref, computed, onMounted } from "vue";
import { getEvents } from "@/services/events";
import { getEventPrices } from "@/services/eventPrices";
import { getHalls } from "@/services/halls";
import type { Event, EventPrice, Hall } from "@viernulvier/shared";

/**
 * Event data extended with full hall details and price range.
 */
export interface EnrichedEvent extends Omit<Event, "hall"> {
  hall: Hall | null;
  minPrice: number | null;
  maxPrice: number | null;
}

function groupPricesForEvents(
  productionEvents: Event[],
  allPrices: EventPrice[],
): Record<number, EventPrice[]> {
  const ids = new Set(productionEvents.map((e) => e.id));
  const grouped: Record<number, EventPrice[]> = {};

  for (const row of allPrices) {
    const eventId = row.event;
    if (typeof eventId !== "number" || !ids.has(eventId)) continue;
    (grouped[eventId] ??= []).push(row);
  }

  return grouped;
}

/** Smallest / largest amounts across tiers (amounts already rounded to whole euros). */
function rawMinMaxAmounts(amounts: number[]): {
  minPrice: number | null;
  maxPrice: number | null;
} {
  return amounts.reduce(
    (acc, amount) => ({
      minPrice:
        acc.minPrice === null ? amount : Math.min(acc.minPrice, amount),
      maxPrice:
        acc.maxPrice === null ? amount : Math.max(acc.maxPrice, amount),
    }),
    { minPrice: null as number | null, maxPrice: null as number | null },
  );
}

/**
 * Prices shown on cards: tier amounts rounded to whole euros; min skips a ubiquitous free (0)
 * tier by using the second-lowest distinct amount when the lowest is 0.
 */
function displayPriceRange(priceRows: EventPrice[]): {
  minPrice: number | null;
  maxPrice: number | null;
} {
  if (priceRows.length === 0) {
    return { minPrice: null, maxPrice: null };
  }

  const amounts = priceRows.map(({ amount }) => Math.round(amount));
  const raw = rawMinMaxAmounts(amounts);
  const sortedDistinct = [...new Set(amounts)].sort((a, b) => a - b);

  let minPrice = raw.minPrice;
  if (
    sortedDistinct.length >= 2 &&
    sortedDistinct[0] === 0
  ) {
    minPrice = sortedDistinct[1]!;
  }

  return { minPrice, maxPrice: raw.maxPrice };
}
/**
 * Fetches events for a production and attaches hall info and prices.
 */
export function useProductionEvents(productionId: number) {
  const events = ref<Event[]>([]);
  const halls = ref<Hall[]>([]);
  const pricesByEventId = ref<Record<number, EventPrice[]>>({});

  const loading = ref(true);
  const error = ref<Error | null>(null);

  async function fetchEvents() {
    loading.value = true;
    error.value = null;

    try {
      const [eventData, hallData, priceRows] = await Promise.all([
        getEvents(productionId),
        getHalls(),
        getEventPrices().catch((): EventPrice[] => []),
      ]);

      events.value = eventData;
      halls.value = hallData;
      pricesByEventId.value = groupPricesForEvents(eventData, priceRows);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error("Unknown error");
    } finally {
      loading.value = false;
    }
  }

  onMounted(fetchEvents);

  /**
   * Merge events + hall + prijzen
   */
  const enrichedEvents = computed<EnrichedEvent[]>(() => {
    return events.value.map((event) => {
      const hallMatch = halls.value.find((h) => h.id === event.hall);
      const priceRows = pricesByEventId.value[event.id] ?? [];

      const { minPrice, maxPrice } = displayPriceRange(priceRows);

      return {
        ...event,
        hall: hallMatch ?? null,
        minPrice,
        maxPrice,
      };
    });
  });

  return {
    events: enrichedEvents,
    loading,
    error,
    retry: fetchEvents,
  };
}
