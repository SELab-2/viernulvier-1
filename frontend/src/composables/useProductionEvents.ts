import { ref, computed, onMounted } from "vue";
import { getEvents } from "@/services/events";
import { getEventPrices } from "@/services/eventPrices";
import { getHalls } from "@/services/halls";
import type { Event, EventPrice, Hall } from "@viernulvier/shared";

/**
 * Event data extended with full hall details and price range.
 */
export interface EnrichedEvent extends Omit<Event, 'hall'> {
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

/**
 * Fetches events for a production and attaches hall info and prices.
 */
export function useProductionEvents(productionId: number) {
  const events = ref<Event[]>([]);
  const halls = ref<Hall[]>([]);
  const pricesByEventId = ref<Record<number, EventPrice[]>>({});
  const loading = ref(true);

  onMounted(async () => {
    try {
      const [eventData, hallData, priceRows] = await Promise.all([
        getEvents(productionId),
        getHalls(),
        getEventPrices().catch((): EventPrice[] => []),
      ]);
      events.value = eventData;
      halls.value = hallData;
      pricesByEventId.value = groupPricesForEvents(eventData, priceRows);
    } finally {
      loading.value = false;
    }
  });

  /**
   * Merges event data with hall details and calculates 
   * the lowest and highest ticket prices.
   */
  const enrichedEvents = computed<EnrichedEvent[]>(() => {
    return events.value.map((event) => {
      const hallMatch = halls.value.find((h) => h.id === event.hall);
      const priceRows = pricesByEventId.value[event.id] ?? [];
      const { minPrice, maxPrice } = priceRows.reduce(
        (acc, { amount }) => ({
          minPrice: acc.minPrice === null ? amount : Math.min(acc.minPrice, amount),
          maxPrice: acc.maxPrice === null ? amount : Math.max(acc.maxPrice, amount),
        }),
        { minPrice: null as number | null, maxPrice: null as number | null },
      );

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
  };
}
