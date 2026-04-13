import { ref, computed, onMounted } from "vue";
import { getEvents } from "@/services/events";
import { getHalls } from "@/services/halls";
import type { Event, Hall } from "@viernulvier/shared";

/**
 * Event data extended with full hall details and price range.
 */
export interface EnrichedEvent extends Omit<Event, 'hall'> {
  hall: Hall | null;
  minPrice: number | null;
  maxPrice: number | null;
}

/**
 * Fetches events for a production and attaches hall info and prices.
 */
export function useProductionEvents(productionId: number) {
  const events = ref<Event[]>([]);
  const halls = ref<Hall[]>([]);
  const loading = ref(true);

  onMounted(async () => {
    try {
      const [eventData, hallData] = await Promise.all([
        getEvents(productionId),
        getHalls(),
      ]);
      events.value = eventData;
      halls.value = hallData;
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
      
      const prices = event.price as { amount: number }[] | undefined;
      const { minPrice, maxPrice } = (prices ?? []).reduce(
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