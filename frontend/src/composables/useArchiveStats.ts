/**
 * @file Composable that fetches archive statistics from the API.
 *
 * Returns reactive counts for productions, events, tags and the
 * computed year span of the archive (earliest event → today).
 *
 * All four API calls run in parallel. While loading, counts default
 * to `null` so the UI can show a placeholder or skeleton.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useArchiveStats } from "@/composables/useArchiveStats";
 * const { stats, isLoading } = useArchiveStats();
 * </script>
 * ```
 */

import { ref, onMounted } from "vue";
import { getProductions } from "@/services/productions";
import { getEvents } from "@/services/events";
import { getTags } from "@/services/tags";

export interface ArchiveStats {
  productions: number | null;
  events: number | null;
  yearsOfHistory: number | null;
  genres: number | null;
}

export function useArchiveStats() {
  const stats = ref<ArchiveStats>({
    productions: null,
    events: null,
    yearsOfHistory: null,
    genres: null,
  });

  const isLoading = ref(true);

  onMounted(async () => {
    try {
      const [productions, events, tags] = await Promise.all([
        getProductions(),
        getEvents(),
        getTags(),
      ]);

      // Derive earliest year from event start dates
      let earliestYear = new Date().getFullYear();
      for (const event of events) {
        const year = new Date(event.starts_at).getFullYear();
        if (year < earliestYear && year > 1900) {
          earliestYear = year;
        }
      }
      const yearsOfHistory = new Date().getFullYear() - earliestYear;

      stats.value = {
        productions: productions.length,
        events: events.length,
        yearsOfHistory: yearsOfHistory > 0 ? yearsOfHistory : null,
        genres: tags.length,
      };
    } catch {
      // On error, stats stay null — the component can handle gracefully
    } finally {
      isLoading.value = false;
    }
  });

  return { stats, isLoading };
}
