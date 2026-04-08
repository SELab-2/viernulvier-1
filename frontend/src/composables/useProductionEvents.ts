import { ref, computed, onMounted } from "vue";
import { getEvents } from "@/services/events";
import { getHalls } from "@/services/halls";
import type { Event, Hall } from "@viernulvier/shared";

export interface EnrichedEvent extends Omit<Event, 'hall'> {
  hall: Hall | null;
  displayPrice: number | null;
}

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

  const enrichedEvents = computed<EnrichedEvent[]>(() => {
    return events.value.map((event) => {
      const hallMatch = halls.value.find((h) => h.id === event.hall);
      
      const prices = event.price as { amount: number }[] | undefined;

      return {
        ...event,
        hall: hallMatch ?? null,
        displayPrice: prices?.[0]?.amount ?? null,
      };
    });
  });

  return {
    events: enrichedEvents,
    loading,
  };
}